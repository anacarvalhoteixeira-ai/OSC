import { z } from "zod";
import { atualizarDemanda, buscarDemanda, criarDemanda, listarDemandas, excluirRegistroAtendimento } from "../models/demanda.model.js";
import { CATEGORIAS_DEMANDA, STATUS_DEMANDA } from "../utils/enums.js";
import { dataOpcional, ehOsc, erroPrisma, idDaRota, limparQuery, validar } from "../utils/http.js";
import { podeConsultarDemanda, podeEditarDemanda } from "../utils/demanda.js";

const camposOsc = {
  titulo: z.string().trim().min(3).max(180),
  descricao: z.string().trim().min(3).max(5000),
  categoria: z.enum(CATEGORIAS_DEMANDA),
  prazo: dataOpcional,
};

export async function removerRegistroAtendimento(req, res) {
  const id = idDaRota(req.params.id);
  const registroId = idDaRota(req.params.registroId);
  if (!id || !registroId) return res.status(400).json({ erro: "ID inválido." });
  const dados = validar(z.object({ versao: z.number().int().nonnegative() }).strict(), req.body, res);
  if (!dados) return;
  try {
    const atual = await buscarDemanda(id);
    if (!atual) return res.status(404).json({ erro: "Demanda não encontrada." });
    const registro = atual.historico.find(h => h.id === registroId && h.tipo === "ATENDIMENTO");
    if (!registro) return res.status(404).json({ erro: "Atendimento não encontrado." });
    if (registro.usuario.id !== req.usuario.id) return res.status(403).json({ erro: "Somente quem registrou o atendimento pode excluí-lo." });
    if (dados.versao !== atual.versao) return res.status(409).json({ erro: "A demanda foi atualizada. Reabra os detalhes antes de excluir." });
    const demanda = await excluirRegistroAtendimento(atual, registroId, req.usuario.id);
    if (!demanda) return res.status(409).json({ erro: "A demanda mudou. Atualize os detalhes e tente novamente." });
    return res.json({ demanda });
  } catch (erro) { return erroPrisma(res, erro); }
}
const schemaCriacao = z.object({ ...camposOsc, categoria: camposOsc.categoria.default("OUTROS") }).strict();
const schemaEdicao = z.object({ ...camposOsc }).partial().extend({ versao: z.number().int().nonnegative() }).strict();
const textoAtendimento = z.string().trim().min(1).max(5000).optional();
const schemaAtendimento = z.object({
  versao: z.number().int().nonnegative(),
  status: z.enum(STATUS_DEMANDA).optional(),
  resposta: textoAtendimento,
  observacao: textoAtendimento,
}).strict();
const dataFiltro = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const data = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === v;
});
const schemaFiltros = z.object({
  busca: z.string().max(180).optional(),
  status: z.enum(STATUS_DEMANDA).optional(),
  categoria: z.enum(CATEGORIAS_DEMANDA).optional(),
  organizacaoId: z.coerce.number().int().positive().optional(),
  de: dataFiltro.optional(),
  ate: dataFiltro.optional(),
}).refine(v => !v.de || !v.ate || v.de <= v.ate, { message: "A data inicial não pode ser posterior à final." });

export async function listar(req, res) {
  const filtros = validar(schemaFiltros, limparQuery(req.query), res);
  if (!filtros) return;
  if (ehOsc(req)) filtros.organizacaoId = req.usuario.organizacaoId;
  try { return res.json({ demandas: await listarDemandas(filtros) }); }
  catch (erro) { return erroPrisma(res, erro); }
}

export async function obter(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de demanda inválido." });
  try {
    const demanda = await buscarDemanda(id);
    if (!demanda) return res.status(404).json({ erro: "Demanda não encontrada." });
    if (!podeConsultarDemanda(req.usuario, demanda)) return res.status(403).json({ erro: "Você só pode consultar demandas da sua própria OSC." });
    return res.json({ demanda });
  } catch (erro) { return erroPrisma(res, erro); }
}

export async function criar(req, res) {
  const dados = validar(schemaCriacao, req.body, res);
  if (!dados) return;
  try {
    const demanda = await criarDemanda({ ...dados, organizacaoId: req.usuario.organizacaoId, solicitanteId: req.usuario.id }, req.usuario.id);
    return res.status(201).json({ demanda });
  } catch (erro) { return erroPrisma(res, erro); }
}

export async function atualizar(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de demanda inválido." });
  const osc = ehOsc(req);
  const permitidos = new Set(osc ? ["versao", ...Object.keys(camposOsc)] : ["versao", "status", "resposta", "observacao"]);
  if (req.body && Object.keys(req.body).some(c => !permitidos.has(c))) return res.status(403).json({ erro: osc ? "Você só pode editar os dados da demanda. Atendimento e status são definidos pela UOSCC." : "A UOSCC pode registrar atendimento e status, preservando os dados do solicitante." });
  const dados = validar(osc ? schemaEdicao : schemaAtendimento, req.body, res);
  if (!dados) return;
  const { versao, ...alteracoes } = dados;
  if (!Object.keys(alteracoes).length) return res.status(400).json({ erro: "Informe os dados que deseja atualizar." });
  try {
    const atual = await buscarDemanda(id);
    if (!atual) return res.status(404).json({ erro: "Demanda não encontrada." });
    if (!podeConsultarDemanda(req.usuario, atual)) return res.status(403).json({ erro: "Você só pode acessar demandas da sua própria OSC." });
    if (osc && !podeEditarDemanda(req.usuario, atual)) return res.status(409).json({ erro: "Esta demanda já está em atendimento e não pode mais ser editada." });
    if (versao !== atual.versao) return res.status(409).json({ erro: "Esta demanda foi atualizada por outra pessoa. Reabra os detalhes antes de salvar." });
    let registro;
    if (osc) {
      registro = { tipo: "EDICAO" };
    } else {
      if (alteracoes.status === atual.status && !alteracoes.resposta && !alteracoes.observacao) return res.status(400).json({ erro: "Escolha um novo status ou registre uma resposta ou observação." });
      registro = { tipo: "ATENDIMENTO", resposta: alteracoes.resposta, observacao: alteracoes.observacao };
      delete alteracoes.resposta;
      delete alteracoes.observacao;
      alteracoes.responsavelId = req.usuario.id;
      if (alteracoes.status !== undefined) alteracoes.dataConclusao = alteracoes.status === "ATENDIDA" ? (atual.status === "ATENDIDA" ? atual.dataConclusao : new Date()) : null;
    }
    const demanda = await atualizarDemanda(atual, alteracoes, req.usuario.id, registro, osc);
    if (!demanda) return res.status(409).json({ erro: "A demanda mudou durante a gravação. Atualize os detalhes e tente novamente." });
    return res.json({ demanda });
  } catch (erro) { return erroPrisma(res, erro); }
}
