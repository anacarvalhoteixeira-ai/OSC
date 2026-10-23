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
  organizacaoId: z.number().int().positive(),
};
const schemaCriacao = z.object({
  ...campos,
  status: campos.status.default("PLANEJAMENTO"),
  organizacaoId: campos.organizacaoId.optional(),
}).strict();
const schemaAtualizacao = z.object(campos).partial().strict();
const schemaFiltros = z.object({
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
  if (ehOsc(req)) filtros.organizacaoId = req.usuario.organizacaoId ?? -1;
  try {
    return res.json({ projetos: await listarProjetos(filtros) });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

export async function obter(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de projeto inválido." });
  try {
    const projeto = await buscarProjeto(id);
    if (!projeto) return res.status(404).json({ erro: "Projeto não encontrado." });
    if (ehOsc(req) && projeto.organizacaoId !== req.usuario.organizacaoId) {
      return res.status(403).json({ erro: "Você só pode consultar projetos da sua própria OSC." });
    }
    const totalAtendidos = projeto.atendimentos.reduce((soma, a) => soma + a.quantidade, 0);
    return res.json({ projeto: { ...projeto, totalAtendidos } });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

export async function criar(req, res) {
  const dados = validar(schemaCriacao, req.body, res);
  if (!dados) return;
  if (ehOsc(req)) dados.organizacaoId = req.usuario.organizacaoId;
  if (!dados.organizacaoId) return res.status(400).json({ erro: "Informe a OSC do projeto." });
  const erroRegra = regraDatas(dados);
  if (erroRegra) return res.status(400).json({ erro: erroRegra });
  try {
    const projeto = await criarProjeto({ ...dados, criadorId: req.usuario.id });
    return res.status(201).json({ projeto });
  } catch (erro) {
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
    if (ehOsc(req)) {
      if (atual.organizacaoId !== req.usuario.organizacaoId) {
        return res.status(403).json({ erro: "Você só pode editar projetos da sua própria OSC." });
      }
      if (dados.organizacaoId !== undefined && dados.organizacaoId !== atual.organizacaoId) {
        return res.status(403).json({ erro: "Apenas a equipe UOSCC pode mover um projeto de OSC." });
      }
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
    return erroPrisma(res, erro);
  }
}

export async function remover(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de projeto inválido." });
  try {
    await excluirProjeto(id);
    return res.status(204).end();
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}
