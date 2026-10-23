import { z } from "zod";
import prisma from "../config/prisma.js";
import { erroPrisma, idDaRota, limparQuery, validar } from "../utils/http.js";

const schemaFiltros = z.object({
  status: z.enum(["PENDENTE", "APROVADA", "RECUSADA"]).optional(),
});

const schemaRecusa = z.object({
  motivo: z.string().trim().min(3, "Informe um motivo de recusa com no mínimo 3 caracteres.").max(1000),
});

// Listar solicitações
export async function listar(req, res) {
  const filtros = validar(schemaFiltros, limparQuery(req.query), res);
  if (!filtros) return;

  try {
    const solicitacoes = await prisma.solicitacaoCadastro.findMany({
      where: filtros.status ? { status: filtros.status } : {},
      include: {
        organizacao: { select: { id: true, nome: true, cnpj: true, responsavel: true } },
        analisadoPor: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { criadoEm: "desc" },
    });
    return res.json({ solicitacoes });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

// Aprovar solicitação (Transação com proteção contra race conditions)
export async function aprovar(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de solicitação inválido." });

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const solicitacao = await tx.solicitacaoCadastro.findUnique({
        where: { id },
      });

      if (!solicitacao) {
        throw new Error("Solicitação não encontrada.");
      }
      if (solicitacao.status !== "PENDENTE") {
        throw new Error("Esta solicitação já foi analisada anteriormente.");
      }

      // Impede que usuário comum altere permissões de si mesmo
      if (solicitacao.emailUsuario === req.usuario.email) {
        throw new Error("Um usuário não pode aprovar a sua própria solicitação.");
      }

      let oscIdFinal = solicitacao.organizacaoId;

      if (solicitacao.tipo === "NOVA_OSC") {
        // Checagem de concorrência antes de criar a OSC
        if (solicitacao.cnpj) {
          const oscExistente = await tx.organizacao.findUnique({
            where: { cnpj: solicitacao.cnpj },
          });
          if (oscExistente) {
            throw new Error(`Uma OSC com o CNPJ ${solicitacao.cnpj} já foi aprovada/cadastrada no sistema.`);
          }
        }

        const novaOsc = await tx.organizacao.create({
          data: {
            nome: solicitacao.nomeOsc,
            cnpj: solicitacao.cnpj,
            categoria: solicitacao.categoria,
            endereco: solicitacao.endereco || "Não informado",
            bairro: solicitacao.bairro,
            responsavel: solicitacao.nomeUsuario,
            telefone: solicitacao.telefoneOsc || solicitacao.telefoneUsuario || "Não informado",
            email: solicitacao.emailOsc,
            descricao: solicitacao.descricaoOsc,
          },
        });
        oscIdFinal = novaOsc.id;
      }

      // Cria a conta do responsável já aprovada e associada à OSC
      const novoUsuario = await tx.usuario.create({
        data: {
          nome: solicitacao.nomeUsuario,
          email: solicitacao.emailUsuario,
          senha: solicitacao.senhaUsuario,
          telefone: solicitacao.telefoneUsuario,
          papel: "RESPONSAVEL_OSC",
          ativo: true,
          organizacaoId: oscIdFinal,
        },
      });

      // Atualiza o registro da solicitação
      const solAtualizada = await tx.solicitacaoCadastro.update({
        where: { id },
        data: {
          status: "APROVADA",
          organizacaoId: oscIdFinal,
          analisadoPorId: req.usuario.id,
          dataAnalise: new Date(),
        },
      });

      return { usuario: novoUsuario, solicitacao: solAtualizada };
    });

    return res.json({
      mensagem: "Solicitação aprovada com sucesso. A OSC e o responsável foram devidamente registrados e vinculados.",
      resultado,
    });
  } catch (erro) {
    return res.status(400).json({ erro: erro.message || "Não foi possível aprovar a solicitação." });
  }
}

// Recusar solicitação com motivo
export async function recusar(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de solicitação inválido." });

  const dados = validar(schemaRecusa, req.body, res);
  if (!dados) return;

  try {
    const solicitacao = await prisma.solicitacaoCadastro.findUnique({ where: { id } });
    if (!solicitacao) return res.status(404).json({ erro: "Solicitação não encontrada." });
    if (solicitacao.status !== "PENDENTE") {
      return res.status(400).json({ erro: "Esta solicitação já foi analisada anteriormente." });
    }

    const solRecusada = await prisma.solicitacaoCadastro.update({
      where: { id },
      data: {
        status: "RECUSADA",
        motivoRecusa: dados.motivo,
        analisadoPorId: req.usuario.id,
        dataAnalise: new Date(),
      },
    });

    return res.json({
      mensagem: "Solicitação recusada e motivo registrado no histórico.",
      solicitacao: solRecusada,
    });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}
