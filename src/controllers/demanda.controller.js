import { z } from "zod";
import {
  atualizarDemanda, buscarDemanda, criarDemanda, excluirDemanda, listarDemandas,
} from "../models/demanda.model.js";
import { CATEGORIAS_DEMANDA, STATUS_DEMANDA } from "../utils/enums.js";
import { dataOpcional, ehOsc, erroPrisma, idDaRota, limparQuery, validar } from "../utils/http.js";

const idOpcional = z.number().int().positive().nullable();
const campos = {
  titulo: z.string().trim().min(3).max(180),
  descricao: z.string().trim().min(3).max(5000),
  categoria: z.enum(CATEGORIAS_DEMANDA),
  status: z.enum(STATUS_DEMANDA),
  organizacaoId: idOpcional,
  responsavelId: idOpcional,
  prazo: dataOpcional,
  dataConclusao: dataOpcional,
  resultado: z.string().trim().max(5000).nullable().optional(),
};
const schemaCriacao = z.object({
  titulo: campos.titulo,
  descricao: campos.descricao,
  categoria: campos.categoria.default("OUTROS"),
  organizacaoId: campos.organizacaoId.optional(), // null = demanda geral da rede
  status: campos.status.default("ABERTA"),
  prazo: campos.prazo,
  dataConclusao: campos.dataConclusao,
  resultado: campos.resultado,
}).strict();
const schemaAtualizacao = z.object(campos).partial().strict();
const schemaFiltros = z.object({
  busca: z.string().max(180).optional(),
  status: z.enum(STATUS_DEMANDA).optional(),
  categoria: z.enum(CATEGORIAS_DEMANDA).optional(),
  organizacaoId: z.coerce.number().int().positive().optional(),
});
const camposDaOsc = new Set(["titulo", "descricao", "categoria", "prazo"]);

// Concluída (ATENDIDA) ganha data de conclusão automática; qualquer outro status limpa a data.
function ajustarConclusao(dados, atual) {
  if (dados.status === undefined) return;
  if (dados.status === "ATENDIDA") dados.dataConclusao ??= atual?.dataConclusao ?? new Date();
  else dados.dataConclusao = null;
}

export async function listar(req, res) {
  const filtros = validar(schemaFiltros, limparQuery(req.query), res);
  if (!filtros) return;
  if (ehOsc(req)) filtros.organizacaoId = req.usuario.organizacaoId ?? -1;
  try {
    return res.json({ demandas: await listarDemandas(filtros) });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

export async function obter(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de demanda inválido." });
  try {
    const demanda = await buscarDemanda(id);
    if (!demanda) return res.status(404).json({ erro: "Demanda não encontrada." });
    if (ehOsc(req) && demanda.organizacaoId !== req.usuario.organizacaoId) {
      return res.status(403).json({ erro: "Você só pode consultar demandas da sua própria OSC." });
    }
    return res.json({ demanda });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

export async function criar(req, res) {
  const dados = validar(schemaCriacao, req.body, res);
  if (!dados) return;
  if (ehOsc(req)) {
    dados.organizacaoId = req.usuario.organizacaoId;
    dados.status = "ABERTA";
    delete dados.dataConclusao;
    delete dados.resultado;
  }
  ajustarConclusao(dados, null);
  try {
    const demanda = await criarDemanda({ ...dados, solicitanteId: req.usuario.id });
    return res.status(201).json({ demanda });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

export async function atualizar(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de demanda inválido." });
  const dados = validar(schemaAtualizacao, req.body, res);
  if (!dados) return;
  if (Object.keys(dados).length === 0) return res.status(400).json({ erro: "Envie ao menos um campo para atualizar." });
  try {
    const atual = await buscarDemanda(id);
    if (!atual) return res.status(404).json({ erro: "Demanda não encontrada." });
    if (ehOsc(req)) {
      if (atual.organizacaoId !== req.usuario.organizacaoId) {
        return res.status(403).json({ erro: "Você só pode editar demandas da sua própria OSC." });
      }
      if (Object.keys(dados).some((campo) => !camposDaOsc.has(campo))) {
        return res.status(403).json({ erro: "Status e responsável são definidos pela equipe UOSCC." });
      }
      if (atual.status !== "ABERTA") {
        return res.status(409).json({ erro: "A demanda já está em tratamento. Fale com a equipe UOSCC." });
      }
    }
    ajustarConclusao(dados, atual);
    return res.json({ demanda: await atualizarDemanda(id, dados) });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

export async function remover(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de demanda inválido." });
  try {
    await excluirDemanda(id);
    return res.status(204).end();
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}
