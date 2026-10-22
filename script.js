import "./inicio.css";
// ============================================================
// Painel UOSCC — script principal. Conversa com a API em /api.
// ============================================================
const PAGINA_LOGIN = "/login.html"; // ajuste para o caminho real da sua tela de login

const CATEGORIAS_OSC = {
  educacao: "Educação e formação cidadã",
  "meio-ambiente": "Meio ambiente e sustentabilidade",
  saude: "Saúde e bem-estar comunitário",
  social: "Assistência social e apoio às famílias",
  direitos: "Direitos humanos e inclusão social",
  cultura: "Cultura, esporte e lazer",
};
const STATUS_PROJETO = { PLANEJAMENTO: "Planejando", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", PAUSADO: "Pausado" };
const STATUS_DEMANDA = { ABERTA: "Pendente", EM_ANALISE: "Em andamento", ATENDIDA: "Concluído", RECUSADA: "Recusada" };
const STATUS_DEMANDA_ABERTA = { ABERTA: "Pendente", EM_ANALISE: "Em andamento" };
const CATEGORIAS_DEMANDA = { MATERIAIS: "Materiais", VOLUNTARIOS: "Voluntários", FINANCEIRO: "Financeiro", SERVICOS: "Serviços", OUTROS: "Outros" };
const CAMPOS_REL = {
  osc: { dados: "Dados cadastrais", projetos: "Projetos", demandas: "Demandas", pessoas: "Pessoas atendidas" },
  projeto: { dados: "Dados do projeto", resultados: "Objetivo e resultados", pessoas: "Pessoas atendidas" },
};
const PRINCIPAIS = ["inicio", "oscs", "projetos", "demandas", "relatorios"];
const MENU_DE = { "ficha-osc": "oscs", "cadastro-osc": "oscs", "cadastro-projeto": "projetos", "cadastro-demanda": "demandas" };

// ---------- Sessão ----------
const guarda = [localStorage, sessionStorage].find((s) => s.getItem("uoscc_token"));
const token = guarda?.getItem("uoscc_token");
let usuario = null;
try { usuario = JSON.parse(guarda?.getItem("uoscc_usuario")); } catch { /* sessão inválida */ }
const ehOsc = usuario?.papel === "RESPONSAVEL_OSC";
const podeExcluir = ["ADMIN", "GESTOR"].includes(usuario?.papel);
const estado = { oscs: [], oscAtual: null, relatorio: null };

function sair() {
  for (const s of [localStorage, sessionStorage]) { s.removeItem("uoscc_token"); s.removeItem("uoscc_usuario"); }
  location.replace(PAGINA_LOGIN);
}

// ---------- Utilitários ----------
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtData = (v) => (v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");
const paraInput = (v) => (v ? String(v).slice(0, 10) : "");
const nuloSeVazio = (v) => (v.trim() === "" ? null : v.trim());
const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const qs = (obj) => { const t = new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== "" && v != null)).toString(); return t ? `?${t}` : ""; };
const rotulo = (mapa, chave) => mapa[chave] ?? chave ?? "—";

function avisar(msg, erro = false) {
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.className = `fixed bottom-5 right-5 z-50 max-w-sm rounded-xl px-4 py-3 text-sm text-white shadow-lg ${erro ? "bg-red-600" : "bg-emerald-600"}`;
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 4500);
}

async function tentar(fn) {
  try { return await fn(); } catch (erro) { avisar(erro.message || "Algo deu errado.", true); }
}

async function api(caminho, { method = "GET", corpo } = {}) {
  const res = await fetch(`/api${caminho}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(corpo ? { "Content-Type": "application/json" } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (res.status === 401) { sair(); throw new Error("Sessão expirada."); }
  if (res.status === 204) return null;
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detalhes = (dados.detalhes ?? []).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error([dados.erro, detalhes].filter(Boolean).join(" — ") || "Falha na requisição.");
  }
  return dados;
}

function preencherSelect(el, mapa, vazio) {
  el.innerHTML = (vazio ? `<option value="">${esc(vazio)}</option>` : "")
    + Object.entries(mapa).map(([v, r]) => `<option value="${esc(v)}">${esc(r)}</option>`).join("");
}

async function carregarListaOscs() {
  if (ehOsc) {
    const { organizacao } = await api(`/organizacoes/${usuario.organizacaoId}`);
    estado.oscs = [organizacao];
  } else {
    estado.oscs = (await api("/organizacoes")).organizacoes;
  }
}

function preencherOscs(select, aviso) {
  const opcoes = estado.oscs.map((o) => `<option value="${o.id}">${esc(o.nome)}</option>`).join("");
  select.innerHTML = (estado.oscs.length > 1 ? `<option value="">Selecione uma OSC</option>` : "") + opcoes;
  aviso.classList.toggle("hidden", estado.oscs.length > 0);
}

const classeItem = "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800";
const botoesItem = (extra = "") => `<div class="flex gap-2 text-sm">${extra}<button type="button" data-act="editar" class="btn-secundario px-3 py-2">Editar</button>${podeExcluir ? `<button type="button" data-act="excluir" class="btn-secundario px-3 py-2 text-red-600">Excluir</button>` : ""}</div>`;
const infoItem = (titulo, sub) => `<div><p class="font-semibold">${esc(titulo)}</p><p class="text-xs text-slate-500 dark:text-slate-400">${sub}</p></div>`;

function ligarLista(ulId, acoes) {
  $(ulId).addEventListener("click", (e) => {
    const botao = e.target.closest("button[data-act]");
    if (!botao) return;
    const id = Number(botao.closest("li").dataset.id);
    const fn = acoes[botao.dataset.act];
    if (fn) tentar(() => fn(id));
  });
}

// ---------- Navegação ----------
function ir(nome) {
  document.querySelectorAll("[data-pagina]").forEach((s) => s.classList.toggle("hidden", s.id !== `pagina-${nome}`));
  const menu = MENU_DE[nome] ?? nome;
  document.querySelectorAll(".menu-link").forEach((a) => {
    const ativo = a.dataset.menu === menu;
    a.classList.toggle("bg-orange-400", ativo);
    a.classList.toggle("text-slate-950", ativo);
    a.classList.toggle("font-semibold", ativo);
    a.classList.toggle("text-blue-100", !ativo);
    a.classList.toggle("hover:bg-white/10", !ativo);
  });
  window.scrollTo(0, 0);
  const carregar = { inicio: carregarInicio, oscs: carregarOscs, projetos: carregarProjetos, demandas: carregarDemandas, relatorios: prepararRelatorios }[nome];
  if (carregar) tentar(carregar);
}
const navegar = (nome) => (location.hash === `#${nome}` ? ir(nome) : (location.hash = nome));
const paginaDaHash = () => (PRINCIPAIS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "inicio");

// ---------- Início ----------
async function carregarInicio() {
  let pessoas, oscs, abertas, lista;
  if (!ehOsc) {
    const { painel: p } = await api("/painel");
    pessoas = p.totais.pessoasAtendidas;
    oscs = p.totais.organizacoes;
    abertas = (p.demandasPorStatus.ABERTA ?? 0) + (p.demandasPorStatus.EM_ANALISE ?? 0);
    lista = p.demandasEmAberto;
  } else {
    const [{ total }, { demandas }] = await Promise.all([api("/atendimentos"), api("/demandas")]);
    const ab = demandas.filter((d) => ["ABERTA", "EM_ANALISE"].includes(d.status));
    pessoas = total; oscs = 1; abertas = ab.length; lista = ab.slice(0, 5);
  }
  $("numeracao-pessoas").textContent = pessoas;
  $("total-oscs").textContent = oscs;
  $("total-demandas").textContent = abertas;
  $("lista-lembretes").innerHTML = lista.length
    ? `<ul class="space-y-2 text-sm">${lista.map((d) => `<li class="flex flex-wrap justify-between gap-2"><span>${esc(d.titulo)} <span class="text-xs text-slate-500 dark:text-slate-400">· ${esc(d.organizacao?.nome ?? "Rede")}</span></span><span class="text-xs">${esc(rotulo(STATUS_DEMANDA, d.status))}${d.prazo ? ` · prazo ${fmtData(d.prazo)}` : ""}</span></li>`).join("")}</ul>`
    : `<p class="text-sm text-slate-500 dark:text-slate-400">Nenhuma demanda em aberto no momento.</p>`;
  if (podeExcluir) await carregarPendentes(); // podeExcluir = ADMIN ou GESTOR
}

// Contas criadas por "Solicitar cadastro" ficam inativas até a equipe aprovar (só ADMIN/GESTOR).
async function carregarPendentes() {
  const { usuarios } = await api("/usuarios?ativo=false");
  let bloco = $("bloco-pendentes");
  if (!bloco) {
    bloco = document.createElement("section");
    bloco.id = "bloco-pendentes";
    bloco.className = "mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800";
    $("pagina-inicio").append(bloco);
  }
  bloco.classList.toggle("hidden", usuarios.length === 0);
  bloco.innerHTML = `<h3 class="mb-3 text-sm font-bold text-[#122957] dark:text-white">🔔 Acessos aguardando aprovação</h3><ul class="space-y-2 text-sm">${usuarios.map((u) => `<li data-id="${u.id}" class="flex flex-wrap items-center justify-between gap-3"><span>${esc(u.nome)} <span class="text-xs text-slate-500 dark:text-slate-400">· ${esc(u.email)} · ${esc(u.organizacao?.nome ?? "sem OSC")}</span></span><button type="button" data-act="aprovar" class="btn-primario px-3 py-2">Aprovar</button></li>`).join("")}</ul>`;
}

// ---------- OSCs ----------
async function carregarOscs() {
  const f = $("form-pesquisa-oscs");
  let lista;
  if (ehOsc) { await carregarListaOscs(); lista = estado.oscs; }
  else lista = (await api(`/organizacoes${qs({ busca: f.busca.value.trim(), categoria: f.categoria.value })}`)).organizacoes;
  $("itens-oscs").innerHTML = lista.map((o) => `<li data-id="${o.id}" class="${classeItem}">${infoItem(o.nome, `${esc(rotulo(CATEGORIAS_OSC, o.categoria))} · ${esc(o.cnpj)} · ${esc(o.responsavel)} · ${esc(o.telefone)}`)}${botoesItem(`<button type="button" data-act="ver" class="btn-secundario px-3 py-2">Ver ficha</button>`)}</li>`).join("");
  $("sem-oscs").classList.toggle("hidden", lista.length > 0);
}

function abrirFormularioOsc(osc) {
  const f = $("form-osc");
  f.reset();
  $("titulo-form-osc").textContent = osc ? "Editar OSC" : "Cadastrar OSC";
  $("osc-id").value = osc?.id ?? "";
  if (osc) for (const c of ["nome", "cnpj", "categoria", "endereco", "bairro", "responsavel", "telefone", "email", "descricao"]) f.elements[c].value = osc[c] ?? "";
  // Responsável da OSC não altera nome/CNPJ (regra da API); campos desabilitados não são enviados.
  f.elements.nome.disabled = f.elements.cnpj.disabled = ehOsc && !!osc;
  ir("cadastro-osc");
}

async function salvarOsc(e) {
  e.preventDefault();
  const f = e.currentTarget;
  const id = $("osc-id").value;
  const v = Object.fromEntries(new FormData(f));
  const dados = {
    categoria: v.categoria, endereco: v.endereco.trim(), bairro: v.bairro.trim(), responsavel: v.responsavel.trim(),
    telefone: v.telefone.trim(), email: v.email.trim(), descricao: v.descricao.trim(),
  };
  if (v.nome !== undefined) { dados.nome = v.nome.trim(); dados.cnpj = v.cnpj.trim(); }
  await tentar(async () => {
    await api(id ? `/organizacoes/${id}` : "/organizacoes", { method: id ? "PUT" : "POST", corpo: dados });
    avisar("OSC salva com sucesso.");
    ir("oscs");
  });
}

const paresOsc = (o) => [
  ["CNPJ", o.cnpj], ["Categoria", rotulo(CATEGORIAS_OSC, o.categoria)],
  ["Endereço", [o.endereco, o.bairro].filter(Boolean).join(" — ")], ["Responsável", o.responsavel],
  ["Telefone", o.telefone], ["E-mail", o.email], ["Descrição", o.descricao],
];

async function abrirFicha(id) {
  const [{ organizacao: o }, { total }] = await Promise.all([api(`/organizacoes/${id}`), api(`/atendimentos${qs({ organizacaoId: id })}`)]);
  estado.oscAtual = o;
  $("ficha-osc-nome").textContent = o.nome;
  $("ficha-osc-categoria").textContent = rotulo(CATEGORIAS_OSC, o.categoria);
  $("ficha-osc-dados").innerHTML = paresOsc(o).map(([k, v]) => `<div><dt class="font-medium text-slate-500 dark:text-slate-400">${esc(k)}</dt><dd>${esc(v || "—")}</dd></div>`).join("");
  $("ficha-osc-pessoas").textContent = total;
  const li = (t, s) => `<li class="flex justify-between gap-3"><span>${esc(t)}</span><span class="text-xs">${esc(s)}</span></li>`;
  $("ficha-osc-projetos").innerHTML = o.projetos.map((p) => li(p.titulo, rotulo(STATUS_PROJETO, p.status))).join("");
  $("ficha-osc-sem-projetos").classList.toggle("hidden", o.projetos.length > 0);
  $("ficha-osc-demandas").innerHTML = o.demandas.map((d) => li(d.titulo, rotulo(STATUS_DEMANDA, d.status))).join("");
  $("ficha-osc-sem-demandas").classList.toggle("hidden", o.demandas.length > 0);
  ir("ficha-osc");
}

// ---------- Projetos ----------
async function carregarProjetos() {
  const f = $("form-pesquisa-projetos");
  const { projetos } = await api(`/projetos${qs({ busca: f.busca.value.trim(), status: f.status.value })}`);
  $("itens-projetos").innerHTML = projetos.map((p) => `<li data-id="${p.id}" class="${classeItem}">${infoItem(p.titulo, `${esc(p.organizacao.nome)} · ${esc(rotulo(STATUS_PROJETO, p.status))} · ${fmtData(p.dataInicio)} → ${fmtData(p.dataFim)}`)}${botoesItem()}</li>`).join("");
  $("sem-projetos").classList.toggle("hidden", projetos.length > 0);
}

async function abrirFormularioProjeto(id) {
  await tentar(async () => {
    await carregarListaOscs();
    const f = $("form-projeto");
    f.reset();
    preencherOscs($("proj-osc"), $("aviso-sem-oscs"));
    $("titulo-form-projeto").textContent = id ? "Editar projeto" : "Cadastrar projeto";
    $("proj-id").value = id ?? "";
    if (id) {
      const { projeto: p } = await api(`/projetos/${id}`);
      f.elements.osc_id.value = p.organizacaoId;
      for (const c of ["titulo", "responsavel", "telefone", "email", "status", "descricao", "objetivo", "resultados"]) f.elements[c].value = p[c] ?? "";
      f.elements.data_inicio.value = paraInput(p.dataInicio);
      f.elements.data_fim.value = paraInput(p.dataFim);
      f.elements.pessoas_atendidas.value = p.totalAtendidos || "";
      f.elements.orcamento.value = p.orcamento ?? "";
    }
    ir("cadastro-projeto");
  });
}

// O campo "pessoas atendidas" do formulário é o total do projeto: ajusta o registro mais recente.
async function ajustarAtendidos(projeto, alvo) {
  const { projeto: p } = await api(`/projetos/${projeto.id}`);
  const dif = alvo - p.totalAtendidos;
  if (dif === 0) return;
  const ultimo = p.atendimentos[0];
  if (ultimo && ultimo.quantidade + dif > 0) {
    await api(`/atendimentos/${ultimo.id}`, { method: "PUT", corpo: { quantidade: ultimo.quantidade + dif } });
  } else if (!ultimo && dif > 0) {
    await api("/atendimentos", { method: "POST", corpo: { organizacaoId: projeto.organizacaoId, projetoId: projeto.id, quantidade: dif, descricao: "Informado no cadastro do projeto" } });
  } else {
    throw new Error("Projeto salvo, mas o total de pessoas não pôde ser reduzido automaticamente. Ajuste os registros de atendimento.");
  }
}

async function salvarProjeto(e) {
  e.preventDefault();
  const v = Object.fromEntries(new FormData(e.currentTarget));
  const id = $("proj-id").value;
  const pessoas = v.pessoas_atendidas === "" ? null : Number(v.pessoas_atendidas);
  if (pessoas !== null && (!Number.isInteger(pessoas) || pessoas < 0)) return avisar("Informe um número inteiro de pessoas atendidas.", true);
  const dados = {
    titulo: v.titulo.trim(), organizacaoId: Number(v.osc_id), status: v.status,
    descricao: nuloSeVazio(v.descricao), objetivo: nuloSeVazio(v.objetivo), resultados: nuloSeVazio(v.resultados),
    responsavel: nuloSeVazio(v.responsavel), telefone: nuloSeVazio(v.telefone), email: v.email.trim(),
    dataInicio: v.data_inicio || null, dataFim: v.data_fim || null,
    orcamento: v.orcamento === "" ? null : Number(v.orcamento),
  };
  if (ehOsc) delete dados.organizacaoId;
  await tentar(async () => {
    const { projeto } = await api(id ? `/projetos/${id}` : "/projetos", { method: id ? "PUT" : "POST", corpo: dados });
    if (pessoas !== null) await ajustarAtendidos(projeto, pessoas);
    avisar("Projeto salvo com sucesso.");
    ir("projetos");
  });
}

// ---------- Demandas ----------
async function carregarDemandas() {
  const f = $("form-pesquisa-demandas");
  const { demandas } = await api(`/demandas${qs({ busca: f.busca.value.trim(), status: f.status.value })}`);
  const abertas = demandas.filter((d) => ["ABERTA", "EM_ANALISE"].includes(d.status)); // concluídas vão para o relatório anual
  const hoje = new Date().toISOString().slice(0, 10);
  $("itens-demandas").innerHTML = abertas.map((d) => {
    const atrasada = d.prazo && d.prazo.slice(0, 10) < hoje;
    return `<li data-id="${d.id}" class="${classeItem}">${infoItem(d.titulo, `${esc(d.organizacao?.nome ?? "Rede")} · ${esc(rotulo(CATEGORIAS_DEMANDA, d.categoria))} · ${esc(rotulo(STATUS_DEMANDA, d.status))} · <span class="${atrasada ? "font-semibold text-red-600" : ""}">prazo ${fmtData(d.prazo)}</span>`)}${botoesItem()}</li>`;
  }).join("");
  $("sem-demandas").classList.toggle("hidden", abertas.length > 0);
}

const alternarConclusao = () => $("bloco-dem-conclusao").classList.toggle("hidden", $("dem-status").value !== "ATENDIDA");

async function abrirFormularioDemanda(id) {
  await tentar(async () => {
    await carregarListaOscs();
    const f = $("form-demanda");
    f.reset();
    preencherOscs($("dem-osc"), $("aviso-sem-oscs-demanda"));
    $("titulo-form-demanda").textContent = id ? "Editar demanda" : "Cadastrar demanda";
    $("dem-id").value = id ?? "";
    f.elements.status.disabled = ehOsc; // status é definido pela equipe
    if (id) {
      const { demanda: d } = await api(`/demandas/${id}`);
      if (d.organizacaoId) f.elements.osc_id.value = d.organizacaoId;
      for (const c of ["titulo", "categoria", "status", "descricao", "resultado"]) f.elements[c].value = d[c] ?? "";
      f.elements.prazo.value = paraInput(d.prazo);
      f.elements.data_conclusao.value = paraInput(d.dataConclusao);
    }
    alternarConclusao();
    ir("cadastro-demanda");
  });
}

async function salvarDemanda(e) {
  e.preventDefault();
  const v = Object.fromEntries(new FormData(e.currentTarget));
  const id = $("dem-id").value;
  const dados = {
    titulo: v.titulo.trim(), descricao: v.descricao.trim() || v.titulo.trim(), categoria: v.categoria,
    organizacaoId: Number(v.osc_id), prazo: v.prazo || null,
    ...(v.status !== undefined && {
      status: v.status,
      dataConclusao: v.status === "ATENDIDA" ? v.data_conclusao || null : null,
      resultado: nuloSeVazio(v.resultado),
    }),
  };
  if (ehOsc && id) delete dados.organizacaoId;
  await tentar(async () => {
    await api(id ? `/demandas/${id}` : "/demandas", { method: id ? "PUT" : "POST", corpo: dados });
    avisar("Demanda salva com sucesso.");
    ir("demandas");
  });
}

// ---------- Relatórios ----------
async function prepararRelatorios() {
  $("rel-ano").value ||= String(new Date().getFullYear());
  await trocarTipoRelatorio();
}

async function trocarTipoRelatorio() {
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

async function gerarIndividual() {
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

async function gerarAnual() {
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

function baixarCsv() {
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
function aplicarTema(escuro) {
  document.documentElement.classList.toggle("dark", escuro);
  $("icone-tema").textContent = escuro ? "☀️" : "🌙";
  $("texto-tema").textContent = escuro ? "Modo claro" : "Modo escuro";
}

// ---------- Inicialização ----------
function iniciar() {
  const guardado = localStorage.getItem("uoscc_tema");
  aplicarTema(guardado ? guardado === "escuro" : matchMedia("(prefers-color-scheme: dark)").matches);
  $("botao-tema").addEventListener("click", () => {
    const escuro = !document.documentElement.classList.contains("dark");
    localStorage.setItem("uoscc_tema", escuro ? "escuro" : "claro");
    aplicarTema(escuro);
  });

  const agora = new Date();
  const dataHoje = $("data-hoje");
  if (dataHoje) dataHoje.textContent = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(agora);
  const diaSemana = $("dia-semana");
  if (diaSemana) diaSemana.textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(agora);

  const botaoSair = Object.assign(document.createElement("button"), { type: "button", textContent: "Sair" });
  botaoSair.className = "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800";
  botaoSair.addEventListener("click", sair);
  $("botao-tema").after(botaoSair);

  // Impressão: mostra só o relatório (não depende de editar o CSS do projeto)
  document.head.append(Object.assign(document.createElement("style"), {
    textContent: "@media print { body * { visibility: hidden; } #area-relatorio, #area-relatorio * { visibility: visible; color: #000 !important; } #area-relatorio { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; } }",
  }));

  preencherSelect($("filtro-categoria"), CATEGORIAS_OSC, "Todas as categorias");
  preencherSelect($("osc-categoria"), CATEGORIAS_OSC, "Selecione uma categoria");
  preencherSelect($("filtro-status"), STATUS_PROJETO, "Todos os status");
  preencherSelect($("proj-status"), STATUS_PROJETO);
  preencherSelect($("filtro-status-demanda"), STATUS_DEMANDA_ABERTA, "Todos os status");
  preencherSelect($("dem-status"), STATUS_DEMANDA);
  preencherSelect($("dem-categoria"), CATEGORIAS_DEMANDA, "Selecione");
  if (ehOsc) $("botao-nova-osc").classList.add("hidden");

  document.addEventListener("click", (e) => {
    const aprovar = e.target.closest("[data-act='aprovar']");
    if (aprovar) {
      return tentar(async () => {
        await api(`/usuarios/${aprovar.closest("li").dataset.id}/aprovar`, { method: "PATCH" });
        avisar("Acesso aprovado.");
        await carregarPendentes();
      });
    }
    const link = e.target.closest("[data-menu], [data-secao]");
    if (link) { e.preventDefault(); return navegar(link.dataset.menu ?? link.dataset.secao); }
    const acao = e.target.closest("[data-action]")?.dataset.action;
    if (acao === "abrir-formulario-osc") abrirFormularioOsc();
    else if (acao === "editar-osc") abrirFormularioOsc(estado.oscAtual);
    else if (acao === "abrir-formulario-projeto") abrirFormularioProjeto();
    else if (acao === "abrir-formulario-demanda") abrirFormularioDemanda();
  });

  for (const [id, recarregar] of [["form-pesquisa-oscs", carregarOscs], ["form-pesquisa-projetos", carregarProjetos], ["form-pesquisa-demandas", carregarDemandas]]) {
    $(id).addEventListener("submit", (e) => e.preventDefault());
    $(id).addEventListener("input", debounce(() => tentar(recarregar)));
  }
  $("form-osc").addEventListener("submit", salvarOsc);
  $("form-projeto").addEventListener("submit", salvarProjeto);
  $("form-demanda").addEventListener("submit", salvarDemanda);
  $("dem-status").addEventListener("change", alternarConclusao);

  ligarLista("itens-oscs", {
    ver: abrirFicha,
    editar: async (id) => abrirFormularioOsc((await api(`/organizacoes/${id}`)).organizacao),
    excluir: async (id) => {
      if (!confirm("Excluir esta OSC? Só é possível se ela não tiver projetos, demandas ou atendimentos.")) return;
      await api(`/organizacoes/${id}`, { method: "DELETE" });
      avisar("OSC excluída.");
      await carregarOscs();
    },
  });
  ligarLista("itens-projetos", {
    editar: abrirFormularioProjeto,
    excluir: async (id) => {
      if (!confirm("Excluir este projeto?")) return;
      await api(`/projetos/${id}`, { method: "DELETE" });
      avisar("Projeto excluído.");
      await carregarProjetos();
    },
  });
  ligarLista("itens-demandas", {
    editar: abrirFormularioDemanda,
    excluir: async (id) => {
      if (!confirm("Excluir esta demanda?")) return;
      await api(`/demandas/${id}`, { method: "DELETE" });
      avisar("Demanda excluída.");
      await carregarDemandas();
    },
  });

  $("rel-tipo").addEventListener("change", () => tentar(trocarTipoRelatorio));
  $("btn-gerar-individual").addEventListener("click", () => tentar(gerarIndividual));
  $("btn-gerar-anual").addEventListener("click", () => tentar(gerarAnual));
  $("btn-imprimir").addEventListener("click", () => window.print());
  $("btn-csv").addEventListener("click", baixarCsv);

  window.addEventListener("hashchange", () => ir(paginaDaHash()));
  ir(paginaDaHash());
}

if (!token || !usuario) sair();
else iniciar();
