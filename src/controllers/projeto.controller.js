import prisma from "../config/prisma.js";
import { podeConsultarProjeto, podeEditarProjeto, podeExcluirProjeto } from "../utils/permissoes.js";
import { z } from "zod";
import {
  atualizarProjeto, buscarProjeto, criarProjeto, excluirProjeto, listarProjetos,
} from "../models/projeto.model.js";
import { STATUS_PROJETO } from "../utils/enums.js";
import { dataOpcional, ehOsc, erroPrisma, idDaRota, limparQuery, validar } from "../utils/http.js";

const campos = {
  titulo: z.string().trim().min(2).max(180),
  descricao: z.string().trim().max(5000).nullable().optional(),
  objetivo: z.string().trim().max(5000).nullable().optional(),
  resultados: z.string().trim().max(5000).nullable().optional(),
  orcamento: z.number().min(0).max(999_999_999).nullable().optional(),
  responsavel: z.string().trim().max(120).nullable().optional(),
  telefone: z.string().trim().max(20).nullable().optional(),
  email: z.preprocess((v) => (v === "" ? null : v), z.string().trim().email().max(191).nullable()).optional(),
  status: z.enum(STATUS_PROJETO),
  dataInicio: dataOpcional,
  dataFim: dataOpcional,
  organizacaoId: z.number().int().positive().nullable(),
  tipo: z.enum(["GERAL", "ESPECIFICO"]),
  todasOscs: z.boolean(),
  participantesIds: z.array(z.number().int().positive()).max(500),
};
const schemaCriacao = z.object({
  ...campos,
  status: campos.status.default("PLANEJAMENTO"),
  organizacaoId: campos.organizacaoId.optional(),
  tipo: campos.tipo.optional(),
  todasOscs: campos.todasOscs.default(false),
  participantesIds: campos.participantesIds.default([]),
}).strict();
const schemaAtualizacao = z.object(campos).partial().strict();
const schemaFiltros = z.object({
  tipo: z.enum(["GERAL", "ESPECIFICO"]).optional(),
  busca: z.string().max(180).optional(),
  status: z.enum(STATUS_PROJETO).optional(),
  organizacaoId: z.coerce.number().int().positive().optional(),
});

// Projeto concluído exige data de término; término não pode ser antes do início.
function regraDatas({ status, dataInicio, dataFim }) {
  if (dataInicio && dataFim && dataFim < dataInicio) return "A data de término não pode ser anterior à de início.";
  if (status === "CONCLUIDO" && !dataFim) return "Projeto concluído precisa ter data de término.";
  return null;
}

export async function listar(req, res) {
  const filtros = validar(schemaFiltros, limparQuery(req.query), res);
  if (!filtros) return;
  if (ehOsc(req)) filtros.visivelParaOscId = req.usuario.organizacaoId ?? -1;
  try {
    return res.json({ projetos: await listarProjetos(filtros) });
  } catch (erro) {
    if (erro.code === "PARTICIPANTES") return res.status(400).json({ erro: erro.message });
    return erroPrisma(res, erro);
  }
}

export async function obter(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de projeto inválido." });
  try {
    const projeto = await buscarProjeto(id, ehOsc(req) ? req.usuario.organizacaoId : undefined);
    if (!projeto) return res.status(404).json({ erro: "Projeto não encontrado." });
    if (!podeConsultarProjeto(req.usuario, projeto)) {
      return res.status(403).json({ erro: "Você só pode consultar projetos da sua própria OSC." });
    }
    const totalAtendidos = projeto.atendimentos.reduce((soma, a) => soma + a.quantidade, 0);
    return res.json({ projeto: { ...projeto, totalAtendidos } });
  } catch (erro) {
    if (erro.code === "PARTICIPANTES") return res.status(400).json({ erro: erro.message });
    return erroPrisma(res, erro);
  }
}

export async function criar(req, res) {
  const dados = validar(schemaCriacao, req.body, res);
  if (!dados) return;
  dados.tipo ??= ehOsc(req) ? "ESPECIFICO" : "GERAL";
  if (!podeEditarProjeto(req.usuario, { tipo: dados.tipo, organizacaoId: req.usuario.organizacaoId })) return res.status(403).json({ erro: "Seu perfil não pode criar este tipo de projeto." });
  if (ehOsc(req) && dados.organizacaoId != null && dados.organizacaoId !== req.usuario.organizacaoId) return res.status(403).json({ erro: "Você só pode criar projetos para sua própria OSC." });
  dados.organizacaoId = ehOsc(req) ? req.usuario.organizacaoId : null;
  const erroRegra = regraDatas(dados);
  if (erroRegra) return res.status(400).json({ erro: erroRegra });
  try {
    await prepararParticipantes(dados);
    const projeto = await criarProjeto({ ...dados, criadorId: req.usuario.id });
    return res.status(201).json({ projeto });
  } catch (erro) {
    if (erro.code === "PARTICIPANTES") return res.status(400).json({ erro: erro.message });
    return erroPrisma(res, erro);
  }
}

export async function atualizar(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de projeto inválido." });
  const dados = validar(schemaAtualizacao, req.body, res);
  if (!dados) return;
  if (Object.keys(dados).length === 0) return res.status(400).json({ erro: "Envie ao menos um campo para atualizar." });
  try {
    const atual = await buscarProjeto(id);
    if (!atual) return res.status(404).json({ erro: "Projeto não encontrado." });
    if (!podeEditarProjeto(req.usuario, atual)) return res.status(403).json({ erro: "Você não pode alterar este projeto." });
    if (dados.tipo !== undefined && dados.tipo !== atual.tipo) return res.status(403).json({ erro: "O tipo do projeto não pode ser alterado." });
    if (dados.organizacaoId !== undefined && dados.organizacaoId !== atual.organizacaoId) return res.status(403).json({ erro: "O projeto não pode ser transferido para outra OSC." });
    if (atual.organizacao && !atual.organizacao.ativa) return res.status(409).json({ erro: "A OSC está inativa. Projeto preservado para consulta." });
    if (atual.tipo === "ESPECIFICO" && (dados.todasOscs === true || dados.participantesIds?.length)) return res.status(400).json({ erro: "Projetos específicos pertencem somente à própria OSC." });
    const participantesIds = dados.participantesIds ?? atual.participantes.map(p => p.id);
    const todasOscs = dados.todasOscs ?? atual.todasOscs;
    if (atual.tipo === "GERAL" && (dados.participantesIds !== undefined || dados.todasOscs !== undefined)) {
      await prepararParticipantes({ ...dados, tipo: atual.tipo, todasOscs, participantesIds }, dados);
    } else {
      delete dados.participantesIds;
    }
    const final = {
      status: dados.status ?? atual.status,
      dataInicio: dados.dataInicio !== undefined ? dados.dataInicio : atual.dataInicio,
      dataFim: dados.dataFim !== undefined ? dados.dataFim : atual.dataFim,
    };
    const erroRegra = regraDatas(final);
    if (erroRegra) return res.status(400).json({ erro: erroRegra });
    return res.json({ projeto: await atualizarProjeto(id, dados) });
  } catch (erro) {
    if (erro.code === "PARTICIPANTES") return res.status(400).json({ erro: erro.message });
    return erroPrisma(res, erro);
  }
}

export async function remover(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de projeto inválido." });
  try {
    const atual = await buscarProjeto(id);
    if (!atual) return res.status(404).json({ erro: "Projeto não encontrado." });
    if (!podeExcluirProjeto(req.usuario, atual)) return res.status(403).json({ erro: "A UOSCC só pode excluir projetos gerais." });
    await excluirProjeto(id);
    return res.status(204).end();
  } catch (erro) {
    if (erro.code === "PARTICIPANTES") return res.status(400).json({ erro: erro.message });
    return erroPrisma(res, erro);
  }
}

async function prepararParticipantes(entrada, saida = entrada) {
  const ids = [...new Set(entrada.participantesIds ?? [])];
  delete saida.participantesIds;
  if (entrada.tipo === "ESPECIFICO") {
    if (entrada.todasOscs || ids.length) { const erro = new Error("Projeto específico não pode envolver outras OSCs."); erro.code = "PARTICIPANTES"; throw erro; }
    saida.todasOscs = false;
    return;
  }
  if (!entrada.todasOscs && ids.length === 0) { const erro = new Error("Selecione as OSCs participantes ou todas as OSCs."); erro.code = "PARTICIPANTES"; throw erro; }
  if (!entrada.todasOscs && await prisma.organizacao.count({ where: { id: { in: ids }, ativa: true } }) !== ids.length) { const erro = new Error("Selecione apenas OSCs ativas."); erro.code = "PARTICIPANTES"; throw erro; }
  saida.participantes = { set: entrada.todasOscs ? [] : ids.map(id => ({ id })) };
  if (saida === entrada) { saida.participantes = { connect: entrada.todasOscs ? [] : ids.map(id => ({ id })) }; }
}
