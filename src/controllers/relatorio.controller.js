import { z } from "zod";
import { listarOrganizacoes } from "../models/organizacao.model.js";
import { listarProjetos } from "../models/projeto.model.js";
import { listarDemandas } from "../models/demanda.model.js";
import { listarAtendimentos } from "../models/atendimento.model.js";
import { gerarCsv } from "../utils/csv.js";
import {
  CATEGORIAS_DEMANDA, CATEGORIAS_OSC, STATUS_DEMANDA, STATUS_PROJETO,
} from "../utils/enums.js";
import { erroPrisma, limparQuery, validar } from "../utils/http.js";

const schemaFiltros = z.object({
  formato: z.enum(["json", "csv"]).default("json"),
  busca: z.string().max(180).optional(),
  categoria: z.string().max(30).optional(),
  status: z.string().max(20).optional(),
  organizacaoId: z.coerce.number().int().positive().optional(),
  projetoId: z.coerce.number().int().positive().optional(),
  de: z.coerce.date().optional(),
  ate: z.coerce.date().optional(),
});

const tipos = {
  organizacoes: {
    valores: { categoria: CATEGORIAS_OSC },
    buscar: listarOrganizacoes,
    colunas: [
      { titulo: "Nome", valor: (l) => l.nome },
      { titulo: "Sigla", valor: (l) => l.sigla },
      { titulo: "CNPJ", valor: (l) => l.cnpj },
      { titulo: "Área de atuação", valor: (l) => l.categoria },
      { titulo: "Bairro", valor: (l) => l.bairro },
      { titulo: "Endereço", valor: (l) => l.endereco },
      { titulo: "Responsável", valor: (l) => l.responsavel },
      { titulo: "Telefone", valor: (l) => l.telefone },
      { titulo: "E-mail", valor: (l) => l.email },
    ],
  },
  projetos: {
    valores: { status: STATUS_PROJETO },
    buscar: listarProjetos,
    colunas: [
      { titulo: "ID", valor: (l) => l.id },
      { titulo: "Título", valor: (l) => l.titulo },
      { titulo: "OSC", valor: (l) => l.organizacao?.nome },
      { titulo: "Status", valor: (l) => l.status },
      { titulo: "Início", valor: (l) => l.dataInicio },
      { titulo: "Término", valor: (l) => l.dataFim },
      { titulo: "Descrição", valor: (l) => l.descricao },
    ],
  },
  demandas: {
    valores: { status: STATUS_DEMANDA, categoria: CATEGORIAS_DEMANDA },
    buscar: listarDemandas,
    colunas: [
      { titulo: "ID", valor: (l) => l.id },
      { titulo: "Título", valor: (l) => l.titulo },
      { titulo: "OSC", valor: (l) => l.organizacao?.nome },
      { titulo: "Categoria", valor: (l) => l.categoria },
      { titulo: "Status", valor: (l) => l.status },
      { titulo: "Solicitante", valor: (l) => l.solicitante?.nome },
      { titulo: "Responsável", valor: (l) => l.responsavel?.nome },
      { titulo: "Criada em", valor: (l) => l.criadoEm },
    ],
  },
  atendimentos: {
    valores: {},
    buscar: listarAtendimentos,
    colunas: [
      { titulo: "ID", valor: (l) => l.id },
      { titulo: "OSC", valor: (l) => l.organizacao?.nome },
      { titulo: "Projeto", valor: (l) => l.projeto?.titulo },
      { titulo: "Pessoas atendidas", valor: (l) => l.quantidade },
      { titulo: "Data", valor: (l) => l.data },
      { titulo: "Período (início)", valor: (l) => l.periodoInicio },
      { titulo: "Período (fim)", valor: (l) => l.periodoFim },
      { titulo: "Descrição", valor: (l) => l.descricao },
    ],
  },
};

export async function gerar(req, res) {
  const tipo = Object.hasOwn(tipos, req.params.tipo) ? tipos[req.params.tipo] : null;
  if (!tipo) return res.status(404).json({ erro: "Relatório não encontrado." });

  const { formato, ...filtros } = validar(schemaFiltros, limparQuery(req.query), res) ?? {};
  if (!formato) return;
  for (const campo of ["status", "categoria"]) {
    if (filtros[campo] && !(tipo.valores[campo] ?? []).includes(filtros[campo])) {
      return res.status(400).json({ erro: `Filtro "${campo}" inválido para este relatório.` });
    }
  }

  try {
    const linhas = await tipo.buscar(filtros);
    if (formato === "csv") {
      const nome = `${req.params.tipo}-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${nome}"`);
      return res.send(gerarCsv(tipo.colunas, linhas));
    }
    return res.json({ total: linhas.length, linhas });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}
