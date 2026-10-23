
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../config/prisma.js";
import {
  buscarUsuarioParaLogin,
  buscarUsuarioPorEmail,
} from "../models/usuario.model.js";

const cnpjFormatado = z
  .string()
  .trim()
  .transform((valor) => valor.replace(/\D/g, ""))
  .refine(
    (valor) => valor.length === 14,
    "O CNPJ deve conter exatamente 14 dígitos."
  )
  .transform((valor) =>
    valor.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    )
  );

const schemaNovaSolicitacao = z
  .object({
    tipo: z.enum(["VINCULO_OSC", "NOVA_OSC"]),
    nome: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(191),
    telefone: z.string().trim().max(20).optional().nullable(),
    senha: z.string().min(8),
    confirmar_senha: z.string(),

    organizacaoId: z.coerce.number().int().positive().optional().nullable(),

    nomeOsc: z.string().trim().max(180).optional().nullable(),
    cnpj: z.string().trim().optional().nullable(),
    categoria: z.string().trim().max(30).optional().nullable(),
    endereco: z.string().trim().max(255).optional().nullable(),
    bairro: z.string().trim().max(120).optional().nullable(),
    telefoneOsc: z.string().trim().max(20).optional().nullable(),

    emailOsc: z.preprocess(
      (valor) => (valor === "" ? null : valor),
      z.string().trim().email().max(191).optional().nullable()
    ),

    descricaoOsc: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((dados) => dados.senha === dados.confirmar_senha, {
    path: ["confirmar_senha"],
    message: "As senhas não conferem.",
  });

const schemaLogin = z.object({
  email: z.string().trim().toLowerCase().email().max(191),
  senha: z.string().min(1),
});

function erroInterno(res, erro) {
  // Registra detalhes no terminal para facilitar o diagnóstico.
  console.error("\n========== ERRO NO AUTH CONTROLLER ==========");
  console.error("Mensagem:", erro?.message);
  console.error("Código:", erro?.code);
  console.error("Detalhes do Prisma:", erro?.meta);
  console.error("Stack:", erro?.stack);
  console.error("=============================================\n");

  // Não expõe detalhes internos do banco ao navegador.
  return res.status(500).json({
    erro: "Não foi possível concluir a solicitação.",
  });
}

// Pesquisa organizações cadastradas.
export async function pesquisarOsc(req, res) {
  const busca =
    typeof req.query.busca === "string" ? req.query.busca.trim() : "";

  if (busca.length < 2) {
    return res.json({ organizacoes: [] });
  }

  const apenasDigitos = busca.replace(/\D/g, "");

  try {
    const organizacoes = await prisma.organizacao.findMany({
      where: {
        OR: [
          { nome: { contains: busca } },
          ...(apenasDigitos.length >= 4
            ? [{ cnpj: { contains: apenasDigitos } }]
            : []),
          { cnpj: { contains: busca } },
        ],
      },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        categoria: true,
        bairro: true,
        endereco: true,
        responsavel: true,
      },
      take: 10,
    });

    return res.json({ organizacoes });
  } catch (erro) {
    return erroInterno(res, erro);
  }
}

// Recebe solicitações de vínculo ou cadastro de nova OSC.
export async function solicitarAcesso(req, res) {
  const validacao = schemaNovaSolicitacao.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      erro: "Dados inválidos.",
      detalhes: validacao.error.issues,
    });
  }

  const dados = validacao.data;

  if (Buffer.byteLength(dados.senha, "utf8") > 72) {
    return res.status(400).json({
      erro: "A senha deve ter no máximo 72 bytes.",
    });
  }

  try {
    console.log("[solicitarAcesso] Iniciando solicitação:", {
      tipo: dados.tipo,
      email: dados.email,
      organizacaoId: dados.organizacaoId ?? null,
    });

    // Verifica se já existe uma conta com o e-mail informado.
    const usuarioExistente = await buscarUsuarioPorEmail(dados.email);

    if (usuarioExistente) {
      return res.status(409).json({
        erro: "Este e-mail já possui uma conta cadastrada no sistema.",
      });
    }

    // Verifica se já existe uma solicitação pendente para o e-mail.
    const solicitacaoPendente =
      await prisma.solicitacaoCadastro.findFirst({
        where: {
          emailUsuario: dados.email,
          status: "PENDENTE",
        },
      });

    if (solicitacaoPendente) {
      return res.status(409).json({
        erro:
          "Já existe uma solicitação pendente de aprovação com este e-mail.",
      });
    }

    const senhaHash = await bcrypt.hash(dados.senha, 12);

    // CENÁRIO A: vínculo com uma OSC existente.
    if (dados.tipo === "VINCULO_OSC") {
      if (!dados.organizacaoId) {
        return res.status(400).json({
          erro: "Selecione a organização para solicitar o vínculo.",
        });
      }

      const organizacao = await prisma.organizacao.findUnique({
        where: { id: dados.organizacaoId },
      });

      if (!organizacao) {
        return res.status(404).json({
          erro: "A organização selecionada não foi encontrada.",
        });
      }

      const vinculoPendente =
        await prisma.solicitacaoCadastro.findFirst({
          where: {
            emailUsuario: dados.email,
            organizacaoId: organizacao.id,
            status: "PENDENTE",
          },
        });

      if (vinculoPendente) {
        return res.status(409).json({
          erro:
            "Você já possui uma solicitação pendente para esta organização.",
        });
      }

      await prisma.solicitacaoCadastro.create({
        data: {
          tipo: "VINCULO_OSC",
          status: "PENDENTE",
          nomeUsuario: dados.nome,
          emailUsuario: dados.email,
          senhaUsuario: senhaHash,
          telefoneUsuario: dados.telefone || null,
          organizacaoId: organizacao.id,
        },
      });

      return res.status(202).json({
        mensagem:
          "Solicitação de vínculo recebida com sucesso! O acesso será liberado após análise da UOSCC.",
      });
    }

    // CENÁRIO B: cadastro de uma nova OSC.
    if (!dados.nomeOsc || dados.nomeOsc.length < 2) {
      return res.status(400).json({
        erro: "Informe o nome da nova organização.",
      });
    }

    let cnpjTratado = null;

    if (dados.cnpj && dados.cnpj.trim() !== "") {
      const validacaoCnpj = cnpjFormatado.safeParse(dados.cnpj);

      if (!validacaoCnpj.success) {
        return res.status(400).json({
          erro: "CNPJ inválido. Digite os 14 dígitos.",
        });
      }

      cnpjTratado = validacaoCnpj.data;

      const oscExistente = await prisma.organizacao.findUnique({
        where: { cnpj: cnpjTratado },
      });

      if (oscExistente) {
        return res.status(409).json({
          erro:
            `Já existe uma OSC cadastrada com o CNPJ ${cnpjTratado} ` +
            `(${oscExistente.nome}). Solicite vínculo à OSC existente.`,
        });
      }

      const solicitacaoCnpjExistente =
        await prisma.solicitacaoCadastro.findFirst({
          where: {
            cnpj: cnpjTratado,
            status: "PENDENTE",
          },
        });

      if (solicitacaoCnpjExistente) {
        return res.status(409).json({
          erro:
            `Já existe uma solicitação pendente de aprovação para o CNPJ ${cnpjTratado}.`,
        });
      }
    }

    console.log("[solicitarAcesso] Salvando solicitação de nova OSC.");

    await prisma.solicitacaoCadastro.create({
      data: {
        tipo: "NOVA_OSC",
        status: "PENDENTE",
        nomeUsuario: dados.nome,
        emailUsuario: dados.email,
        senhaUsuario: senhaHash,
        telefoneUsuario: dados.telefone || null,
        nomeOsc: dados.nomeOsc,
        cnpj: cnpjTratado,
        categoria: dados.categoria || null,
        endereco: dados.endereco || null,
        bairro: dados.bairro || null,
        telefoneOsc: dados.telefoneOsc || null,
        emailOsc: dados.emailOsc || null,
        descricaoOsc: dados.descricaoOsc || null,
      },
    });

    console.log("[solicitarAcesso] Solicitação salva com sucesso.");

    return res.status(202).json({
      mensagem:
        "Solicitação de cadastro de nova OSC enviada com sucesso! A UOSCC avaliará as informações.",
    });
  } catch (erro) {
    if (erro?.code === "P2002") {
      return res.status(409).json({
        erro: "Conflito de dados: e-mail ou CNPJ já cadastrado.",
      });
    }

    return erroInterno(res, erro);
  }
}

// Login.
export async function entrar(req, res) {
  const validacao = schemaLogin.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      erro: "Informe um e-mail e uma senha válidos.",
    });
  }

  try {
    const usuario = await buscarUsuarioParaLogin(validacao.data.email);

    if (
      !usuario ||
      !(await bcrypt.compare(validacao.data.senha, usuario.senha))
    ) {
      return res.status(401).json({
        erro: "E-mail ou senha incorretos.",
      });
    }

    if (!usuario.ativo) {
      return res.status(403).json({
        erro:
          "A sua conta ainda não foi aprovada pela UOSCC ou está inativa.",
      });
    }

    const segredo = process.env.JWT_SECRET;

    if (!segredo) {
      console.error("JWT_SECRET não foi definida no ambiente.");

      return res.status(500).json({
        erro: "Autenticação indisponível.",
      });
    }

    const token = jwt.sign(
      {
        papel: usuario.papel,
        organizacaoId: usuario.organizacaoId,
      },
      segredo,
      {
        subject: String(usuario.id),
        expiresIn: "8h",
      }
    );

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        organizacaoId: usuario.organizacaoId,
      },
    });
  } catch (erro) {
    return erroInterno(res, erro);
  }
}
