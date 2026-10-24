import prisma from "../config/prisma.js";
import { z } from "zod";
import {
  atualizarAtendimento, buscarAtendimento, buscarProjetoDaOsc, criarAtendimento,
  excluirAtendimento, listarAtendimentos,
} from "../models/atendimento.model.js";
import { dataOpcional, ehOsc, erroPrisma, idDaRota, limparQuery, validar } from "../utils/http.js";

const campos = {
  quantidade: z.number().int().positive().max(1_000_000),
  descricao: z.string().trim().max(255).nullable().optional(),
  data: z.coerce.date().optional(),
  periodoInicio: dataOpcional,
  periodoFim: dataOpcional,
  organizacaoId: z.number().int().positive(),
  projetoId: z.number().int().positive().nullable().optional(),
};
const schemaCriacao = z.object({ ...campos, organizacaoId: campos.organizacaoId.optional() }).strict();
const schemaAtualizacao = z.object(campos).omit({ organizacaoId: true }).partial().strict();
const schemaFiltros = z.object({
  organizacaoId: z.coerce.number().int().positive().optional(),
  projetoId: z.coerce.number().int().positive().optional(),
  de: z.coerce.date().optional(),
  ate: z.coerce.date().optional(),
});

async function checarRegras({ organizacaoId, projetoId, periodoInicio, periodoFim }, usuario) {
  if (!await prisma.organizacao.findFirst({ where: { id: organizacaoId, ativa: true }, select: { id: true } })) return "OSC inativa ou inexistente.";
  if (periodoInicio && periodoFim && periodoFim < periodoInicio) {
    return "O fim do período não pode ser anterior ao início.";
  }
  if (projetoId) {
    const projeto = await buscarProjetoDaOsc(projetoId);
    if (!projeto) return "Projeto não encontrado.";
    if (projeto.tipo === "GERAL") {
      if (usuario.papel !== "RESPONSAVEL_UOSCC") return "Somente a UOSCC altera atendimentos de projetos gerais.";
      if (!projeto.todasOscs && !projeto.participantes.some(p => p.id === organizacaoId)) return "A OSC não participa deste projeto.";
    } else {
      if (usuario.papel !== "RESPONSAVEL_OSC" || usuario.organizacaoId !== organizacaoId || projeto.organizacaoId !== organizacaoId) return "Somente responsáveis da OSC alteram seus projetos específicos.";
    }
  }
  return null;
}

export async function listar(req, res) {
  const filtros = validar(schemaFiltros, limparQuery(req.query), res);
  if (!filtros) return;
  if (ehOsc(req)) filtros.organizacaoId = req.usuario.organizacaoId ?? -1;
  try {
    const atendimentos = await listarAtendimentos(filtros);
    const total = atendimentos.reduce((soma, a) => soma + a.quantidade, 0);
    return res.json({ atendimentos, total });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

export async function obter(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de registro inválido." });
  try {
    const atendimento = await buscarAtendimento(id);
    if (!atendimento) return res.status(404).json({ erro: "Registro não encontrado." });
    if (ehOsc(req) && atendimento.organizacaoId !== req.usuario.organizacaoId) {
      return res.status(403).json({ erro: "Você só pode consultar registros da sua própria OSC." });
    }
    return res.json({ atendimento });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

export async function criar(req, res) {
  const dados = validar(schemaCriacao, req.body, res);
  if (!dados) return;
  if (ehOsc(req)) dados.organizacaoId = req.usuario.organizacaoId;
  if (!dados.organizacaoId) return res.status(400).json({ erro: "Informe a OSC do registro." });
  try {
    const erroRegra = await checarRegras(dados, req.usuario);
    if (erroRegra) return res.status(400).json({ erro: erroRegra });
    return res.status(201).json({ atendimento: await criarAtendimento(dados) });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

export async function atualizar(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de registro inválido." });
  const dados = validar(schemaAtualizacao, req.body, res);
  if (!dados) return;
  if (Object.keys(dados).length === 0) return res.status(400).json({ erro: "Envie ao menos um campo para atualizar." });
  try {
    const atual = await buscarAtendimento(id);
    if (!atual) return res.status(404).json({ erro: "Registro não encontrado." });
    if (ehOsc(req) && atual.organizacaoId !== req.usuario.organizacaoId) {
      return res.status(403).json({ erro: "Você só pode editar registros da sua própria OSC." });
    }
    const erroRegra = await checarRegras({
      organizacaoId: atual.organizacaoId,
      projetoId: dados.projetoId !== undefined ? dados.projetoId : atual.projetoId,
      periodoInicio: dados.periodoInicio !== undefined ? dados.periodoInicio : atual.periodoInicio,
      periodoFim: dados.periodoFim !== undefined ? dados.periodoFim : atual.periodoFim,
    }, req.usuario);
    if (erroRegra) return res.status(400).json({ erro: erroRegra });
    return res.json({ atendimento: await atualizarAtendimento(id, dados) });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

export async function remover(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de registro inválido." });
  try {
    const atual = await buscarAtendimento(id);
    if (!atual) return res.status(404).json({ erro: "Atendimento não encontrado." });
    const regra = await checarRegras(atual, req.usuario);
    if (regra) return res.status(403).json({ erro: regra });
    await excluirAtendimento(id);
    return res.status(204).end();
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}
