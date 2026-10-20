import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import {
  buscarOrganizacaoPorNome,
  buscarUsuarioParaLogin,
  buscarUsuarioPorEmail,
  criarSolicitacaoDeAcesso,
} from "../models/usuario.model.js";

const schemaSolicitacao = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(191),
  organizacao: z.string().trim().min(2).max(180),
  senha: z.string().min(8),
  confirmar_senha: z.string(),
}).refine((dados) => dados.senha === dados.confirmar_senha, {
  path: ["confirmar_senha"],
  message: "As senhas não conferem.",
});

const schemaLogin = z.object({
  email: z.string().trim().toLowerCase().email().max(191),
  senha: z.string().min(1),
});

function erroInterno(res, erro) {
  console.error("Falha na autenticação:", erro);
  return res.status(500).json({ erro: "Não foi possível concluir a solicitação." });
}

export async function solicitarAcesso(req, res) {
  const validacao = schemaSolicitacao.safeParse(req.body);
  if (!validacao.success) {
    return res.status(400).json({ erro: "Dados inválidos.", detalhes: validacao.error.issues });
  }

  const dados = validacao.data;
  if (Buffer.byteLength(dados.senha, "utf8") > 72) {
    return res.status(400).json({ erro: "A senha deve ter no máximo 72 bytes." });
  }

  try {
    const organizacao = await buscarOrganizacaoPorNome(dados.organizacao);
    if (!organizacao) {
      return res.status(404).json({ erro: "OSC não encontrada. Peça à equipe UOSCC para cadastrá-la primeiro." });
    }

    if (await buscarUsuarioPorEmail(dados.email)) {
      return res.status(409).json({ erro: "Este e-mail já possui cadastro ou solicitação." });
    }

    const senhaHash = await bcrypt.hash(dados.senha, 12);
    await criarSolicitacaoDeAcesso({
      nome: dados.nome,
      email: dados.email,
      senha: senhaHash,
      organizacaoId: organizacao.id,
    });

    return res.status(202).json({
      mensagem: "Solicitação recebida. O acesso ficará disponível após a aprovação da equipe UOSCC.",
    });
  } catch (erro) {
    if (erro?.code === "P2002") {
      return res.status(409).json({ erro: "Este e-mail já possui cadastro ou solicitação." });
    }
    return erroInterno(res, erro);
  }
}

export async function entrar(req, res) {
  const validacao = schemaLogin.safeParse(req.body);
  if (!validacao.success) {
    return res.status(400).json({ erro: "Informe um e-mail e uma senha válidos." });
  }

  try {
    const usuario = await buscarUsuarioParaLogin(validacao.data.email);
    if (!usuario || !(await bcrypt.compare(validacao.data.senha, usuario.senha))) {
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }
    if (!usuario.ativo) {
      return res.status(403).json({ erro: "A conta ainda não foi aprovada ou está inativa." });
    }

    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      console.error("JWT_SECRET não foi definida no ambiente.");
      return res.status(500).json({ erro: "Autenticação indisponível." });
    }

    const token = jwt.sign(
      { papel: usuario.papel, organizacaoId: usuario.organizacaoId },
      segredo,
      { subject: String(usuario.id), expiresIn: "8h" },
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
