export const CATEGORIAS_OSC = {
  educacao: "Educação e formação cidadã",
  "meio-ambiente": "Meio ambiente e sustentabilidade",
  saude: "Saúde e bem-estar comunitário",
  social: "Assistência social e apoio às famílias",
  direitos: "Direitos humanos e inclusão social",
  cultura: "Cultura, esporte e lazer",
};
export const STATUS_PROJETO = { PLANEJAMENTO: "Planejando", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", PAUSADO: "Pausado" };
export const STATUS_DEMANDA = { ABERTA: "Pendente", EM_ANALISE: "Em andamento", ATENDIDA: "Concluído", RECUSADA: "Recusada" };
export const STATUS_DEMANDA_FILTRO = { ABERTA: "Pendente", EM_ANALISE: "Em andamento", ATENDIDA: "Concluídas", RECUSADA: "Recusadas" };
export const CATEGORIAS_DEMANDA = { MATERIAIS: "Materiais", VOLUNTARIOS: "Voluntários", FINANCEIRO: "Financeiro", SERVICOS: "Serviços", OUTROS: "Outros" };
export const CAMPOS_REL = {
  osc: { dados: "Dados cadastrais", projetos: "Projetos", demandas: "Demandas", pessoas: "Pessoas atendidas" },
  projeto: { dados: "Dados do projeto", resultados: "Objetivo e resultados", pessoas: "Pessoas atendidas" },
};
const PAGINA_LOGIN = "/login.html";
const guarda = [localStorage, sessionStorage].find((item) => item.getItem("uoscc_token"));
export const token = guarda?.getItem("uoscc_token");
export let usuario = null;
try { usuario = JSON.parse(guarda?.getItem("uoscc_usuario")); } catch { /* sessao invalida */ }
export const ehOsc = usuario?.papel === "RESPONSAVEL_OSC";
export const podeExcluir = ["ADMIN", "GESTOR"].includes(usuario?.papel);
export const estado = { oscs: [], oscAtual: null, relatorio: null };

export function sair() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem("uoscc_token");
    storage.removeItem("uoscc_usuario");
  }
  location.replace(PAGINA_LOGIN);
}

export const $ = (id) => document.getElementById(id);
export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));
export const fmtData = (value) => (value
  ? new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" })
  : "—");
export const paraInput = (value) => (value ? String(value).slice(0, 10) : "");
export const nuloSeVazio = (value) => (value.trim() === "" ? null : value.trim());
export const debounce = (callback, ms = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), ms);
  };
};
export const qs = (values) => {
  const query = new URLSearchParams(
    Object.entries(values).filter(([, value]) => value !== "" && value != null),
  ).toString();
  return query ? "?" + query : "";
};
export const rotulo = (mapa, chave) => mapa[chave] ?? chave ?? "—";

export function avisar(message, erro = false) {
  const element = document.createElement("div");
  element.setAttribute("role", "status");
  element.className = "fixed bottom-5 right-5 z-50 max-w-sm rounded-xl px-4 py-3 text-sm text-white shadow-lg "
    + (erro ? "bg-red-600" : "bg-emerald-600");
  element.textContent = message;
  document.body.append(element);
  setTimeout(() => element.remove(), 4500);
}

export async function tentar(callback) {
  try {
    return await callback();
  } catch (erro) {
    avisar(erro.message || "Algo deu errado.", true);
  }
}

export async function api(caminho, { method = "GET", corpo } = {}) {
  const response = await fetch("/api" + caminho, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      ...(corpo ? { "Content-Type": "application/json" } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (response.status === 401) {
    sair();
    throw new Error("Sessão expirada.");
  }
  if (response.status === 204) return null;
  const dados = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detalhes = (dados.detalhes ?? [])
      .map((item) => item.path.join(".") + ": " + item.message)
      .join("; ");
    throw new Error([dados.erro, detalhes].filter(Boolean).join(" — ") || "Falha na requisição.");
  }
  return dados;
}

export function preencherSelect(element, mapa, vazio) {
  element.innerHTML = (vazio ? '<option value="">' + esc(vazio) + "</option>" : "")
    + Object.entries(mapa)
      .map(([value, label]) => '<option value="' + esc(value) + '">' + esc(label) + "</option>")
      .join("");
}

export async function carregarListaOscs() {
  if (ehOsc) {
    const { organizacao } = await api("/organizacoes/" + usuario.organizacaoId);
    estado.oscs = [organizacao];
  } else {
    estado.oscs = (await api("/organizacoes")).organizacoes;
  }
}

export function preencherOscs(select, aviso) {
  const opcoes = estado.oscs
    .map((organizacao) => '<option value="' + organizacao.id + '">' + esc(organizacao.nome) + "</option>")
    .join("");
  const incluirRede = select.id === "dem-osc" && !ehOsc;
  select.innerHTML = (incluirRede
    ? '<option value="">Demanda geral da rede</option>'
    : estado.oscs.length > 1 ? '<option value="">Selecione uma OSC</option>' : "")
    + opcoes;
  aviso.classList.toggle("hidden", estado.oscs.length > 0);
}

export const classeItem = "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800";
export const botoesItem = (extra = "") => '<div class="flex gap-2 text-sm">' + extra
  + '<button type="button" data-act="editar" class="btn-secundario px-3 py-2">Editar</button>'
  + (podeExcluir
    ? '<button type="button" data-act="excluir" class="btn-secundario px-3 py-2 text-red-600">Excluir</button>'
    : "")
  + "</div>";
export const infoItem = (titulo, subtitulo) => '<div><p class="font-semibold">' + esc(titulo)
  + '</p><p class="text-xs text-slate-500 dark:text-slate-400">' + subtitulo + "</p></div>";

export function ligarLista(ulId, acoes) {
  $(ulId).addEventListener("click", (event) => {
    const botao = event.target.closest("button[data-act]");
    if (!botao) return;
    const id = Number(botao.closest("li").dataset.id);
    const callback = acoes[botao.dataset.act];
    if (callback) tentar(() => callback(id));
  });
}

let navegarPara = () => {};
export function configurarNavegacao(callback) {
  navegarPara = callback;
}
export function ir(nome) {
  return navegarPara(nome);
}