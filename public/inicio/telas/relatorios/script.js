import {
  $, api, avisar, CAMPOS_REL, carregarListaOscs, CATEGORIAS_DEMANDA,
  estado, esc, fmtData, qs, rotulo, STATUS_DEMANDA, STATUS_PROJETO, tentar,
} from "../../shared.js";
import { paresOsc } from "../ficha-osc/script.js";
export function inicializarRelatorios() {
  const executar = (acao) => () => tentar(acao);
  $("rel-tipo").addEventListener("change", executar(trocarTipoRelatorio));
  $("btn-gerar-individual").addEventListener("click", executar(gerarIndividual));
  $("btn-gerar-anual").addEventListener("click", executar(gerarAnual));
  $("btn-imprimir").addEventListener("click", () => window.print());
  $("btn-csv").addEventListener("click", baixarCsv);
  document.head.append(Object.assign(document.createElement("style"), {
    textContent: "@media print { body * { visibility: hidden; } #area-relatorio, #area-relatorio * { visibility: visible; color: #000 !important; } #area-relatorio { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; } }",
  }));
}
export async function prepararRelatorios() {
  $("rel-ano").value ||= String(new Date().getFullYear());
  await trocarTipoRelatorio();
}

export async function trocarTipoRelatorio() {
  const tipo = $("rel-tipo").value;
  $("rel-campos").innerHTML = Object.entries(CAMPOS_REL[tipo]).map(([v, r]) => `<label class="flex items-center gap-2"><input type="checkbox" value="${v}" checked class="accent-orange-400" /> ${esc(r)}</label>`).join("");
  let itens;
  if (tipo === "osc") { await carregarListaOscs(); itens = estado.oscs.map((o) => [o.id, o.nome]); }
  else itens = (await api("/projetos")).projetos.map((p) => [p.id, `${p.titulo} (${p.organizacao.nome})`]);
  $("rel-item").innerHTML = itens.map(([id, r]) => `<option value="${id}">${esc(r)}</option>`).join("");
}

function tabelaHtml({ cab, linhas }) {
  if (!linhas.length) return `<p class="text-sm text-slate-500 dark:text-slate-400">Nenhum registro.</p>`;
  const th = cab.map((c) => `<th class="border-b border-slate-200 py-2 pr-4 font-semibold dark:border-slate-700">${esc(c)}</th>`).join("");
  const tr = linhas.map((l) => `<tr>${l.map((c) => `<td class="border-b border-slate-100 py-2 pr-4 dark:border-slate-800">${esc(c)}</td>`).join("")}</tr>`).join("");
  return `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}

function renderRelatorio(rel) {
  estado.relatorio = rel;
  const bloco = (b) => `<section class="mb-5"><h4 class="mb-2 font-semibold">${esc(b.titulo)}</h4>${
    b.pares
      ? `<dl class="grid gap-2 text-sm sm:grid-cols-2">${b.pares.map(([k, v]) => `<div><dt class="text-slate-500 dark:text-slate-400">${esc(k)}</dt><dd>${esc(v || "—")}</dd></div>`).join("")}</dl>`
      : tabelaHtml(b)}</section>`;
  $("conteudo-relatorio").innerHTML = `<h3 class="text-xl font-bold text-[#122957] dark:text-white">${esc(rel.titulo)}</h3><p class="mb-5 text-sm text-slate-500 dark:text-slate-400">${esc(rel.subtitulo)}</p>${rel.blocos.map(bloco).join("")}`;
  $("area-relatorio").classList.remove("hidden");
  $("area-relatorio").scrollIntoView({ behavior: "smooth" });
}

const geradoEm = () => `Gerado em ${new Date().toLocaleDateString("pt-BR")}`;
const dinheiro = (v) => (v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

export async function gerarIndividual() {
  const tipo = $("rel-tipo").value;
  const id = Number($("rel-item").value);
  if (!id) return avisar("Selecione um item para o relatório.", true);
  const marcados = new Set([...document.querySelectorAll("#rel-campos input:checked")].map((i) => i.value));
  const blocos = [];
  let titulo;
  if (tipo === "osc") {
    const [{ organizacao: o }, { projetos }, { demandas }, { atendimentos, total }] = await Promise.all([
      api(`/organizacoes/${id}`), api(`/projetos${qs({ organizacaoId: id })}`),
      api(`/demandas${qs({ organizacaoId: id })}`), api(`/atendimentos${qs({ organizacaoId: id })}`),
    ]);
    titulo = o.nome;
    if (marcados.has("dados")) blocos.push({ titulo: "Dados cadastrais", pares: paresOsc(o) });
    if (marcados.has("projetos")) blocos.push({ titulo: "Projetos", cab: ["Título", "Status", "Início", "Fim"], linhas: projetos.map((p) => [p.titulo, rotulo(STATUS_PROJETO, p.status), fmtData(p.dataInicio), fmtData(p.dataFim)]) });
    if (marcados.has("demandas")) blocos.push({ titulo: "Demandas", cab: ["Título", "Categoria", "Status", "Prazo"], linhas: demandas.map((d) => [d.titulo, rotulo(CATEGORIAS_DEMANDA, d.categoria), rotulo(STATUS_DEMANDA, d.status), fmtData(d.prazo)]) });
    if (marcados.has("pessoas")) {
      blocos.push({ titulo: "Pessoas atendidas", pares: [["Total", String(total)]] });
      blocos.push({ titulo: "Registros de atendimento", cab: ["Data", "Projeto", "Quantidade"], linhas: atendimentos.map((a) => [fmtData(a.data), a.projeto?.titulo ?? "—", String(a.quantidade)]) });
    }
  } else {
    const { projeto: p } = await api(`/projetos/${id}`);
    titulo = p.titulo;
    if (marcados.has("dados")) blocos.push({ titulo: "Dados do projeto", pares: [["OSC", p.organizacao.nome], ["Status", rotulo(STATUS_PROJETO, p.status)], ["Início", fmtData(p.dataInicio)], ["Fim", fmtData(p.dataFim)], ["Responsável", p.responsavel], ["Telefone", p.telefone], ["E-mail", p.email], ["Orçamento", dinheiro(p.orcamento)], ["Descrição", p.descricao]] });
    if (marcados.has("resultados")) blocos.push({ titulo: "Objetivo e resultados", pares: [["Objetivo", p.objetivo], ["Resultados", p.resultados]] });
    if (marcados.has("pessoas")) {
      blocos.push({ titulo: "Pessoas atendidas", pares: [["Total", String(p.totalAtendidos)]] });
      blocos.push({ titulo: "Registros de atendimento", cab: ["Data", "Quantidade", "Descrição"], linhas: p.atendimentos.map((a) => [fmtData(a.data), String(a.quantidade), a.descricao ?? "—"]) });
    }
  }
  if (!blocos.length) return avisar("Marque ao menos uma informação.", true);
  renderRelatorio({ titulo: `Relatório — ${titulo}`, subtitulo: geradoEm(), blocos });
}

export async function gerarAnual() {
  const ano = Number($("rel-ano").value);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return avisar("Informe um ano válido.", true);
  const [{ organizacoes }, { projetos }, { demandas }, { atendimentos, total }] = await Promise.all([
    api("/organizacoes"), api("/projetos"), api("/demandas"), api(`/atendimentos?de=${ano}-01-01&ate=${ano}-12-31`),
  ]);
  const anoDe = (d) => (d ? new Date(d).getUTCFullYear() : null);
  const ativos = projetos.filter((p) => anoDe(p.dataInicio ?? p.criadoEm) <= ano && (p.dataFim ? anoDe(p.dataFim) : 9999) >= ano);
  const concluidosAno = projetos.filter((p) => p.status === "CONCLUIDO" && anoDe(p.dataFim) === ano);
  const demConcluidas = demandas.filter((d) => d.status === "ATENDIDA" && anoDe(d.dataConclusao) === ano);
  const demRegistradas = demandas.filter((d) => anoDe(d.criadoEm) === ano);
  const porOsc = new Map();
  for (const a of atendimentos) porOsc.set(a.organizacao.nome, (porOsc.get(a.organizacao.nome) ?? 0) + a.quantidade);
  renderRelatorio({
    titulo: `Relatório anual ${ano}`, subtitulo: geradoEm(),
    blocos: [
      { titulo: "Resumo", pares: [["OSCs na rede", String(organizacoes.length)], ["Projetos ativos no ano", String(ativos.length)], ["Projetos concluídos no ano", String(concluidosAno.length)], ["Demandas registradas no ano", String(demRegistradas.length)], ["Demandas concluídas no ano", String(demConcluidas.length)], ["Pessoas atendidas no ano", String(total)]] },
      { titulo: "Projetos ativos no ano", cab: ["Título", "OSC", "Status", "Início", "Fim"], linhas: ativos.map((p) => [p.titulo, p.organizacao.nome, rotulo(STATUS_PROJETO, p.status), fmtData(p.dataInicio), fmtData(p.dataFim)]) },
      { titulo: "Demandas concluídas no ano", cab: ["Título", "OSC", "Concluída em", "Resultado"], linhas: demConcluidas.map((d) => [d.titulo, d.organizacao?.nome ?? "Rede", fmtData(d.dataConclusao), d.resultado ?? "—"]) },
      { titulo: "Pessoas atendidas por OSC", cab: ["OSC", "Pessoas"], linhas: [...porOsc].sort((a, b) => b[1] - a[1]).map(([n, q]) => [n, String(q)]) },
    ],
  });
}

export function baixarCsv() {
  const rel = estado.relatorio;
  if (!rel) return;
  const linhas = [[rel.titulo], [rel.subtitulo], []];
  for (const b of rel.blocos) { linhas.push([b.titulo], ...(b.pares ?? [b.cab, ...b.linhas]), []); }
  const celula = (v) => {
    let t = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; // evita injeção de fórmula
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = "\uFEFF" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${rel.titulo.replace(/[^\p{L}\p{N}]+/gu, "-")}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Tema ----------
