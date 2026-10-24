import { criarModuloDemandas } from "./assets/demandas.js";
import { podeEditarProjeto, podeExcluirProjeto } from "./src/utils/permissoes.js";
import "./inicio.css";

// ============================================================
// Painel UOSCC — script principal. Conversa com a API em /api.
// ============================================================

const PAGINA_LOGIN = "/login.html";

const CATEGORIAS_OSC = {
  educacao: "Educação e formação cidadã",
  "meio-ambiente": "Meio ambiente e sustentabilidade",
  saude: "Saúde e bem-estar comunitário",
  social: "Assistência social e apoio às famílias",
  direitos: "Direitos humanos e inclusão social",
  cultura: "Cultura, esporte e lazer",
};

const STATUS_PROJETO = {
  PLANEJAMENTO: "Planejando",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  PAUSADO: "Pausado",
};

const STATUS_DEMANDA = {
  ABERTA: "Aberta",
  EM_ANALISE: "Em análise",
  ATENDIDA: "Atendida",
  RECUSADA: "Recusada",
};

const CATEGORIAS_DEMANDA = {
  MATERIAIS: "Materiais",
  VOLUNTARIOS: "Voluntários",
  FINANCEIRO: "Financeiro",
  SERVICOS: "Serviços",
  OUTROS: "Outros",
};

const CAMPOS_REL = {
  osc: {
    dados: "Dados cadastrais",
    projetos: "Projetos",
    pessoas: "Pessoas atendidas",
  },
  projeto: {
    dados: "Dados do projeto",
    resultados: "Objetivo e resultados",
    pessoas: "Pessoas atendidas",
  },
};

const PRINCIPAIS = ["inicio", "oscs", "projetos", "demandas", "relatorios"];

const MENU_DE = {
  "ficha-osc": "oscs",
  "cadastro-osc": "oscs",
  "cadastro-projeto": "projetos",
  "cadastro-demanda": "demandas",
  "detalhe-demanda": "demandas",
};

// ---------- Sessão ----------

const guarda = [localStorage, sessionStorage].find((s) => s.getItem("uoscc_token"));
const token = guarda?.getItem("uoscc_token");
let usuario = null;
try {
  usuario = JSON.parse(guarda?.getItem("uoscc_usuario"));
} catch {
  /* sessão inválida */
}

if (token && usuario) {
  try {
    const resposta = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    if (!resposta.ok) throw new Error("Sessão indisponível");
    usuario = (await resposta.json()).usuario;
    guarda.setItem("uoscc_usuario", JSON.stringify(usuario));
  } catch {
    sair();
    throw new Error("Entre novamente para continuar.");
  }
}

const ehOsc = usuario?.papel === "RESPONSAVEL_OSC";
const ehAdmin = usuario?.papel === "ADMIN";
const ehUoscc = usuario?.papel === "RESPONSAVEL_UOSCC";
const podeExcluir = ehUoscc;
const estado = { oscs: [], oscAtual: null, relatorio: null };

function sair() {
  for (const s of [localStorage, sessionStorage]) {
    s.removeItem("uoscc_token");
    s.removeItem("uoscc_usuario");
  }
  location.replace(PAGINA_LOGIN);
}

// ---------- Utilitários ----------

const $ = (id) => document.getElementById(id);
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
const fmtData = (v) => (v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");
const paraInput = (v) => (v ? String(v).slice(0, 10) : "");
const nuloSeVazio = (v) => (v.trim() === "" ? null : v.trim());
const debounce = (fn, ms = 300) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};
const qs = (obj) => {
  const t = new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== "" && v != null)).toString();
  return t ? `?${t}` : "";
};
const rotulo = (mapa, chave) => mapa[chave] ?? chave ?? "—";
const demandasUI = criarModuloDemandas({ usuario, api, ir, avisar, esc, fmtData, paraInput, qs, STATUS_DEMANDA, CATEGORIAS_DEMANDA });

function avisar(msg, erro = false) {
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.className = `fixed bottom-5 right-5 z-50 max-w-sm rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
    erro ? "bg-red-600" : "bg-emerald-600"
  }`;
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 4500);
}

async function tentar(fn) {
  try {
    return await fn();
  } catch (erro) {
    avisar(erro.message || "Algo deu errado.", true);
  }
}

async function api(caminho, { method = "GET", corpo } = {}) {
  const res = await fetch(`/api${caminho}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(corpo ? { "Content-Type": "application/json" } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  if (res.status === 401) {
    sair();
    throw new Error("Sessão expirada.");
  }
  if (res.status === 204) return null;

  const dados = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detalhes = (dados.detalhes ?? []).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error([dados.erro, detalhes].filter(Boolean).join(" — ") || "Falha na requisição.");
  }
  return dados;
}

function preencherSelect(el, mapa, vazio) {
  el.innerHTML =
    (vazio ? `<option value="">${esc(vazio)}</option>` : "") +
    Object.entries(mapa)
      .map(([v, r]) => `<option value="${esc(v)}">${esc(r)}</option>`)
      .join("");
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
  const incluirRede = select.id === "dem-osc" && !ehOsc;
  select.innerHTML =
    (incluirRede
      ? `<option value="">Demanda geral da rede</option>`
      : estado.oscs.length > 1
      ? `<option value="">Selecione uma OSC</option>`
      : "") + opcoes;
  aviso.classList.toggle("hidden", estado.oscs.length > 0);
}

const classeItem =
  "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800";
const botoesItem = (extra = "", editar = !ehAdmin, excluir = podeExcluir) =>
  `<div class="flex gap-2 text-sm">${extra}${editar ? `<button type="button" data-act="editar" class="btn-secundario px-3 py-2">Editar</button>` : ""}${
    excluir ? `<button type="button" data-act="excluir" class="btn-secundario px-3 py-2 text-red-600">Excluir</button>` : ""
  }</div>`;
const infoItem = (titulo, sub) =>
  `<div><p class="font-semibold">${esc(titulo)}</p><p class="text-xs text-slate-500 dark:text-slate-400">${sub}</p></div>`;

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
  if ((nome === "relatorios" && !ehUoscc) || (nome === "cadastro-osc" && ehAdmin)) {
    avisar("Esta ação não está disponível para seu perfil.", true); return;
  }
  document.querySelectorAll("[data-pagina]").forEach((s) => s.classList.toggle("hidden", s.id !== `pagina-${nome}`));
  const menu = MENU_DE[nome] ?? nome;
  document.querySelectorAll(".menu-link").forEach((a) => {
    const ativo = a.dataset.menu === menu;
    if (ativo) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
    a.classList.toggle("bg-orange-400", ativo);
    a.classList.toggle("text-slate-950", ativo);
    a.classList.toggle("font-semibold", ativo);
    a.classList.toggle("text-blue-100", !ativo);
    a.classList.toggle("hover:bg-white/10", !ativo);
  });
  window.scrollTo(0, 0);
  const carregar = {
    inicio: carregarInicio,
    oscs: carregarOscs,
    projetos: carregarProjetos,
    demandas: carregarDemandas,
    relatorios: prepararRelatorios,
  }[nome];
  if (carregar) tentar(carregar);
}

const navegar = (nome) => (location.hash === `#${nome}` ? ir(nome) : (location.hash = nome));
const paginaDaHash = () => (PRINCIPAIS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "inicio");

// ---------- Início ----------

async function carregarInicio() {
  let pessoas, oscs, projetos, recentes;
  if (!ehOsc) {
    const { painel: p } = await api("/painel");
    pessoas = p.totais.pessoasAtendidas; oscs = p.totais.organizacoes; projetos = p.totais.projetos; recentes = p.projetosRecentes;
  } else {
    const [{ total }, resultado] = await Promise.all([api("/atendimentos"), api("/projetos")]);
    pessoas = total; oscs = 1; projetos = resultado.projetos.length; recentes = resultado.projetos.slice(0, 5);
  }
  $("numeracao-pessoas").textContent = pessoas;
  $("total-oscs").textContent = oscs;
  $("total-demandas").textContent = projetos;
  $("lista-lembretes").innerHTML = recentes.length
    ? `<ul class="space-y-3">${recentes.map(p => `<li class="flex flex-wrap justify-between gap-2"><span>${esc(p.titulo)} <small>· ${p.tipo === "GERAL" ? "Geral UOSCC" : "Específico OSC"}</small></span><span class="text-sm">${esc(rotulo(STATUS_PROJETO, p.status))}</span></li>`).join("")}</ul>`
    : '<p class="text-sm text-slate-500">Os projetos da rede vão aparecer aqui. Cada ação começa com uma ideia.</p>';
  if (ehUoscc) await carregarPendentes();
}

// Solicitações de cadastro: análise exclusiva da UOSCC.
async function carregarPendentes() {
  if (!podeExcluir) return;

  const { solicitacoes = [] } = await api("/usuarios/solicitacoes?status=PENDENTE");
  let bloco = $("bloco-pendentes");

  if (!bloco) {
    bloco = document.createElement("section");
    bloco.id = "bloco-pendentes";
    bloco.className = "mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800";
    $("pagina-inicio").append(bloco);
  }

  bloco.classList.toggle("hidden", solicitacoes.length === 0);
  bloco.innerHTML = `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 class="text-base font-bold text-[#122957] dark:text-white">🔔 Solicitações aguardando aprovação</h3>
        <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">Confira os dados antes de aprovar ou recusar.</p>
      </div>
      <span class="rounded-full bg-orange-200 px-3 py-1 text-xs font-bold text-orange-950">${solicitacoes.length} pendente(s)</span>
    </div>
    ${
      solicitacoes.length
        ? `
      <ul class="space-y-3">
        ${solicitacoes
          .map((s) => {
            const novaOsc = s.tipo === "NOVA_OSC";
            const nomeOsc = novaOsc ? s.nomeOsc || "Nome da OSC não informado" : s.organizacao?.nome || "OSC não encontrada";
            const tipoLabel = novaOsc ? "NOVA OSC" : "VÍNCULO";
            const tipoClass = novaOsc
              ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200"
              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
            const categoria = s.categoria ? rotulo(CATEGORIAS_OSC, s.categoria) : "Não informada";
            const endereco = [s.endereco, s.bairro].filter(Boolean).join(" — ") || "Não informado";

            return `
            <li data-id="${esc(s.id)}" class="rounded-xl border border-orange-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span class="rounded-full px-3 py-1 text-xs font-bold ${tipoClass}">[${tipoLabel}]</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">Solicitada em ${esc(fmtData(s.criadoEm))}</span>
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <div class="min-w-0">
                  <h4 class="mb-2 text-sm font-bold text-slate-900 dark:text-white">Dados do solicitante</h4>
                  <dl class="space-y-1 text-sm">
                    <div><dt class="inline text-slate-500 dark:text-slate-400">Nome: </dt><dd class="inline font-medium">${esc(
                      s.nomeUsuario || "Não informado"
                    )}</dd></div>
                    <div><dt class="inline text-slate-500 dark:text-slate-400">E-mail: </dt><dd class="inline break-all">${esc(
                      s.emailUsuario || "Não informado"
                    )}</dd></div>
                    <div><dt class="inline text-slate-500 dark:text-slate-400">Telefone: </dt><dd class="inline">${esc(
                      s.telefoneUsuario || "Não informado"
                    )}</dd></div>
                  </dl>
                </div>
                <div class="min-w-0">
                  <h4 class="mb-2 text-sm font-bold text-slate-900 dark:text-white">Dados da organização</h4>
                  <dl class="space-y-1 text-sm">
                    <div><dt class="inline text-slate-500 dark:text-slate-400">OSC: </dt><dd class="inline font-medium">${esc(nomeOsc)}</dd></div>
                    <div><dt class="inline text-slate-500 dark:text-slate-400">CNPJ: </dt><dd class="inline">${esc(
                      s.cnpj || s.organizacao?.cnpj || "Não informado"
                    )}</dd></div>
                    ${
                      novaOsc
                        ? `
                      <div><dt class="inline text-slate-500 dark:text-slate-400">Categoria: </dt><dd class="inline">${esc(categoria)}</dd></div>
                      <div><dt class="inline text-slate-500 dark:text-slate-400">Endereço: </dt><dd class="inline">${esc(endereco)}</dd></div>
                      <div><dt class="inline text-slate-500 dark:text-slate-400">Telefone institucional: </dt><dd class="inline">${esc(
                        s.telefoneOsc || "Não informado"
                      )}</dd></div>
                      <div><dt class="inline text-slate-500 dark:text-slate-400">E-mail institucional: </dt><dd class="inline break-all">${esc(
                        s.emailOsc || "Não informado"
                      )}</dd></div>
                      ${
                        s.descricaoOsc
                          ? `<div class="mt-2"><dt class="font-medium text-slate-500 dark:text-slate-400">Descrição</dt><dd class="mt-1 whitespace-pre-wrap">${esc(
                              s.descricaoOsc
                            )}</dd></div>`
                          : ""
                      }
                    `
                        : `<p class="text-xs text-slate-500 dark:text-slate-400">Pedido para associar o responsável à OSC já cadastrada. A aprovação não criará outra organização.</p>`
                    }
                  </dl>
                </div>
              </div>
              <div class="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                <button type="button" data-act="recusar" class="btn-secundario px-3 py-2 text-red-600">Recusar</button>
                <button type="button" data-act="aprovar" class="btn-primario px-3 py-2">Aprovar solicitação</button>
              </div>
            </li>`;
          })
          .join("")}
      </ul>`
        : `
      <p class="rounded-xl bg-white p-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">Não há solicitações pendentes no momento.</p>`
    }
  `;
}

function abrirModalRecusa(id) {
  document.getElementById("modal-recusa-solicitacao")?.remove();
  const modal = document.createElement("div");
  modal.id = "modal-recusa-solicitacao";
  modal.className = "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4";
  modal.innerHTML = `
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-modal-recusa" class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
      <h3 id="titulo-modal-recusa" class="text-lg font-bold text-slate-900 dark:text-white">Recusar solicitação</h3>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">Informe o motivo. Ele ficará registrado no histórico da solicitação.</p>
      <form id="form-modal-recusa" class="mt-4">
        <label for="motivo-recusa" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Motivo da recusa</label>
        <textarea id="motivo-recusa" name="motivo" required minlength="5" maxlength="1000" rows="4" class="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white" placeholder="Explique por que a solicitação não foi aprovada..."></textarea>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Mínimo de 5 caracteres.</p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" data-modal-cancelar class="btn-secundario px-3 py-2">Cancelar</button>
          <button type="submit" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Confirmar recusa</button>
        </div>
      </form>
    </section>`;

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest("[data-modal-cancelar]")) modal.remove();
  });

  modal.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const motivo = modal.querySelector("#motivo-recusa").value.trim();
    if (motivo.length < 5) {
      avisar("Informe um motivo com pelo menos 5 caracteres.", true);
      return;
    }
    modal.remove();
    tentar(async () => {
      await api(`/usuarios/solicitacoes/${id}/recusar`, { method: "PATCH", corpo: { motivo } });
      avisar("Solicitação recusada. Motivo registrado no histórico.");
      await carregarPendentes();
    });
  });

  document.body.append(modal);
  modal.querySelector("#motivo-recusa").focus();
}

// ---------- OSCs ----------

async function carregarOscs() {
  const f = $("form-pesquisa-oscs");
  let lista;
  if (ehOsc) {
    await carregarListaOscs();
    lista = estado.oscs;
  } else {
    lista = (await api(`/organizacoes${qs({ busca: f.busca.value.trim(), categoria: f.categoria.value, ativa: f.ativa.value })}`)).organizacoes;
  }
  $("itens-oscs").innerHTML = lista
    .map(
      (o) =>
        `<li data-id="${o.id}" class="${classeItem}">${infoItem(
          o.nome,
          `${esc(rotulo(CATEGORIAS_OSC, o.categoria))} · ${esc(o.cnpj)} · ${esc(o.responsavel)} · ${esc(o.telefone)}`
        )}${botoesItem(`<button type="button" data-act="ver" class="btn-secundario px-3 py-2">Ver ficha</button>${o.ativa ? "" : `<span class="text-sm text-slate-500">Inativa · histórico preservado</span>`}`, !ehAdmin && o.ativa, ehUoscc && o.ativa)}</li>`
    )
    .join("");
  $("sem-oscs").classList.toggle("hidden", lista.length > 0);
}

function abrirFormularioOsc(osc) {
  if (ehAdmin) return avisar("O ADMIN tem acesso somente à consulta das OSCs.", true);
  const f = $("form-osc");
  f.reset();
  $("titulo-form-osc").textContent = osc ? "Editar OSC" : "Cadastrar OSC";
  $("osc-id").value = osc?.id ?? "";
  if (osc) {
    for (const c of ["nome", "cnpj", "categoria", "endereco", "bairro", "responsavel", "telefone", "email", "descricao"]) {
      f.elements[c].value = osc[c] ?? "";
    }
  }
  f.elements.nome.disabled = f.elements.cnpj.disabled = ehOsc && !!osc;
  ir("cadastro-osc");
}

async function salvarOsc(e) {
  e.preventDefault();
  const f = e.currentTarget;
  const id = $("osc-id").value;
  const v = Object.fromEntries(new FormData(f));
  const dados = {
    categoria: v.categoria,
    endereco: v.endereco.trim(),
    bairro: v.bairro.trim(),
    responsavel: v.responsavel.trim(),
    telefone: v.telefone.trim(),
    email: v.email.trim(),
    descricao: v.descricao.trim(),
  };
  if (v.nome !== undefined) {
    dados.nome = v.nome.trim();
    dados.cnpj = v.cnpj.trim();
  }
  await tentar(async () => {
    await api(id ? `/organizacoes/${id}` : "/organizacoes", { method: id ? "PUT" : "POST", corpo: dados });
    avisar("OSC salva com sucesso.");
    ir("oscs");
  });
}

const paresOsc = (o) => [
  ["CNPJ", o.cnpj],
  ["Categoria", rotulo(CATEGORIAS_OSC, o.categoria)],
  ["Endereço", [o.endereco, o.bairro].filter(Boolean).join(" — ")],
  ["Responsável", o.responsavel],
  ["Telefone", o.telefone],
  ["E-mail", o.email],
  ["Descrição", o.descricao],
];

async function abrirFicha(id) {
  const [{ organizacao: o }, { total }] = await Promise.all([
    api(`/organizacoes/${id}`),
    api(`/atendimentos${qs({ organizacaoId: id })}`),
  ]);
  estado.oscAtual = o;
  $("ficha-osc-nome").textContent = o.nome;
  $("ficha-osc-categoria").textContent = rotulo(CATEGORIAS_OSC, o.categoria);
  $("ficha-osc-dados").innerHTML = paresOsc(o)
    .map(
      ([k, v]) =>
        `<div><dt class="font-medium text-slate-500 dark:text-slate-400">${esc(k)}</dt><dd>${esc(v || "—")}</dd></div>`
    )
    .join("");
  $("ficha-osc-pessoas").textContent = total;

  const li = (t, s) => `<li class="flex justify-between gap-3"><span>${esc(t)}</span><span class="text-xs">${esc(s)}</span></li>`;
  const { projetos: relacionados } = await api(`/projetos${qs({ organizacaoId: id })}`);
  $("ficha-osc-projetos").innerHTML = relacionados.map((p) => li(p.titulo, rotulo(STATUS_PROJETO, p.status))).join("");
  $("ficha-osc-sem-projetos").classList.toggle("hidden", relacionados.length > 0);
  $("botao-editar-osc-ficha").hidden = ehAdmin || !o.ativa;
  ir("ficha-osc");
}

// ---------- Projetos ----------

async function carregarProjetos() {
  const f = $("form-pesquisa-projetos");
  const { projetos } = await api(`/projetos${qs({ busca: f.busca.value.trim(), status: f.status.value, tipo: f.tipo.value })}`);
  $("itens-projetos").innerHTML = projetos
    .map(
      (p) =>
        `<li data-id="${p.id}" class="${classeItem}">${infoItem(
          p.titulo,
          `${esc((p.organizacao?.nome ?? "Geral UOSCC"))} · ${esc(rotulo(STATUS_PROJETO, p.status))} · ${fmtData(p.dataInicio)} → ${fmtData(
            p.dataFim
          )}`
        )}${botoesItem(`<button type="button" data-act="ver" class="btn-secundario px-3 py-2">Ver projeto</button>`, podeEditarProjeto(usuario, p) && p.organizacao?.ativa !== false, podeExcluirProjeto(usuario, p))}</li>`
    )
    .join("");
  $("sem-projetos").classList.toggle("hidden", projetos.length > 0);
}

async function abrirFormularioProjeto(id, somenteLeitura = false) {
  await tentar(async () => {
    await carregarListaOscs();
    const f = $("form-projeto");
    f.reset();
    for (const campo of f.elements) campo.disabled = false;
    preencherOscs($("proj-osc"), $("aviso-sem-oscs"));
    $("titulo-form-projeto").textContent = id ? "Editar projeto" : "Cadastrar projeto";
    $("proj-id").value = id ?? "";
    $("proj-tipo").value = ehOsc ? "ESPECIFICO" : "GERAL";
    $("proj-participantes").replaceChildren(...estado.oscs.map(o => new Option(o.nome, o.id)));
    $("proj-todas").checked = !ehOsc;
    $("proj-tipo").disabled = true;
    if (id) {
      const { projeto: p } = await api(`/projetos/${id}`);
      f.elements.osc_id.value = p.organizacaoId ?? "";
      $("proj-tipo").value = p.tipo;
      $("proj-todas").checked = p.todasOscs;
      for (const participante of p.participantes) {
        if (![...$("proj-participantes").options].some(o => Number(o.value) === participante.id)) $("proj-participantes").add(new Option(`${participante.nome}${participante.ativa ? "" : " (inativa)"}`, participante.id));
      }
      for (const option of $("proj-participantes").options) option.selected = p.participantes.some(o => o.id === Number(option.value));
      somenteLeitura ||= !podeEditarProjeto(usuario, p) || p.organizacao?.ativa === false;
      for (const c of ["titulo", "responsavel", "telefone", "email", "status", "descricao", "objetivo", "resultados"]) {
        f.elements[c].value = p[c] ?? "";
      }
      f.elements.data_inicio.value = paraInput(p.dataInicio);
      f.elements.data_fim.value = paraInput(p.dataFim);
      f.elements.pessoas_atendidas.value = p.totalAtendidos || "";
      f.elements.orcamento.value = p.orcamento ?? "";
    }
    const geral = $("proj-tipo").value === "GERAL";
    $("proj-osc").closest(".vinculo-projeto").hidden = geral;
    $("proj-osc").required = !geral;
    $("proj-osc").disabled = geral || ehOsc;
    $("proj-participacao").hidden = !geral;
    $("proj-pessoas").closest("div").hidden = geral;
    $("proj-pessoas").disabled = geral;
    $("proj-participantes").disabled = $("proj-todas").checked;
    $("botao-salvar-projeto").hidden = somenteLeitura;
    if (somenteLeitura) {
      for (const campo of f.elements) if (campo.type !== "button") campo.disabled = true;
      $("titulo-form-projeto").textContent = "Detalhes do projeto";
    }
    ir("cadastro-projeto");
  });
}

async function ajustarAtendidos(projeto, alvo) {
  const { projeto: p } = await api(`/projetos/${projeto.id}`);
  const dif = alvo - p.totalAtendidos;
  if (dif === 0) return;
  const ultimo = p.atendimentos[0];
  if (ultimo && ultimo.quantidade + dif > 0) {
    await api(`/atendimentos/${ultimo.id}`, { method: "PUT", corpo: { quantidade: ultimo.quantidade + dif } });
  } else if (!ultimo && dif > 0) {
    await api("/atendimentos", {
      method: "POST",
      corpo: {
        organizacaoId: projeto.organizacaoId,
        projetoId: projeto.id,
        quantidade: dif,
        descricao: "Informado no cadastro do projeto",
      },
    });
  } else {
    throw new Error("Projeto salvo, mas o total de pessoas não pôde ser reduzido automaticamente. Ajuste os atendimentos.");
  }
}

async function salvarProjeto(e) {
  e.preventDefault();
  const v = Object.fromEntries(new FormData(e.currentTarget));
  const id = $("proj-id").value;
  const pessoas = !ehOsc || v.pessoas_atendidas == null || v.pessoas_atendidas === "" ? null : Number(v.pessoas_atendidas);
  if (pessoas !== null && (!Number.isInteger(pessoas) || pessoas < 0)) {
    return avisar("Informe um número inteiro de pessoas atendidas.", true);
  }

  const dados = {
    titulo: v.titulo.trim(),
    organizacaoId: ehOsc ? usuario.organizacaoId : null,
    tipo: $("proj-tipo").value,
    todasOscs: $("proj-tipo").value === "GERAL" && $("proj-todas").checked,
    participantesIds: $("proj-tipo").value === "GERAL" && !$("proj-todas").checked ? [...$("proj-participantes").selectedOptions].map(o => Number(o.value)) : [],
    status: v.status,
    descricao: nuloSeVazio(v.descricao),
    objetivo: nuloSeVazio(v.objetivo),
    resultados: nuloSeVazio(v.resultados),
    responsavel: nuloSeVazio(v.responsavel),
    telefone: nuloSeVazio(v.telefone),
    email: v.email.trim(),
    dataInicio: v.data_inicio || null,
    dataFim: v.data_fim || null,
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

const carregarDemandas = () => demandasUI.carregar();
const abrirFormularioDemanda = id => demandasUI.formulario(id);
const salvarDemanda = e => demandasUI.salvar(e);

// ---------- Relatórios ----------

async function prepararRelatorios() {
  $("rel-ano").value ||= String(new Date().getFullYear());
  await trocarTipoRelatorio();
}

async function trocarTipoRelatorio() {
  const tipo = $("rel-tipo").value;
  $("rel-campos").innerHTML = Object.entries(CAMPOS_REL[tipo])
    .map(
      ([v, r]) =>
        `<label class="flex items-center gap-2"><input type="checkbox" value="${v}" checked class="accent-orange-400" /> ${esc(
          r
        )}</label>`
    )
    .join("");

  let itens;
  if (tipo === "osc") {
    await carregarListaOscs();
    itens = estado.oscs.map((o) => [o.id, o.nome]);
  } else {
    itens = (await api("/projetos")).projetos.map((p) => [p.id, `${p.titulo} (${(p.organizacao?.nome ?? "Geral UOSCC")})`]);
  }
  $("rel-item").innerHTML = itens.map(([id, r]) => `<option value="${id}">${esc(r)}</option>`).join("");
}

function tabelaHtml({ cab, linhas }) {
  if (!linhas.length) return `<p class="text-sm text-slate-500 dark:text-slate-400">Nenhum registro.</p>`;
  const th = cab
    .map((c) => `<th class="border-b border-slate-200 py-2 pr-4 font-semibold dark:border-slate-700">${esc(c)}</th>`)
    .join("");
  const tr = linhas
    .map(
      (l) =>
        `<tr>${l.map((c) => `<td class="border-b border-slate-100 py-2 pr-4 dark:border-slate-800">${esc(c)}</td>`).join("")}</tr>`
    )
    .join("");
  return `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}

function renderRelatorio(rel) {
  estado.relatorio = rel;
  const bloco = (b) => `<section class="mb-5"><h4 class="mb-2 font-semibold">${esc(b.titulo)}</h4>${
    b.pares
      ? `<dl class="grid gap-2 text-sm sm:grid-cols-2">${b.pares
          .map(
            ([k, v]) =>
              `<div><dt class="text-slate-500 dark:text-slate-400">${esc(k)}</dt><dd>${esc(v || "—")}</dd></div>`
          )
          .join("")}</dl>`
      : tabelaHtml(b)
  }</section>`;

  $("conteudo-relatorio").innerHTML = `<h3 class="text-xl font-bold text-[#122957] dark:text-white">${esc(
    rel.titulo
  )}</h3><p class="mb-5 text-sm text-slate-500 dark:text-slate-400">${esc(rel.subtitulo)}</p>${rel.blocos
    .map(bloco)
    .join("")}`;
  $("area-relatorio").classList.remove("hidden");
  $("area-relatorio").scrollIntoView({ behavior: "smooth" });
}

const geradoEm = () => `Gerado em ${new Date().toLocaleDateString("pt-BR")}`;
const dinheiro = (v) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function gerarIndividual() {
  const tipo = $("rel-tipo").value;
  const id = Number($("rel-item").value);
  if (!id) return avisar("Selecione um item para o relatório.", true);

  const marcados = new Set([...document.querySelectorAll("#rel-campos input:checked")].map((i) => i.value));
  const blocos = [];
  let titulo;

  if (tipo === "osc") {
    const [{ organizacao: o }, { projetos }, { atendimentos, total }] = await Promise.all([
      api(`/organizacoes/${id}`),
      api(`/projetos${qs({ organizacaoId: id })}`),
      api(`/atendimentos${qs({ organizacaoId: id })}`),
    ]);
    titulo = o.nome;
    if (marcados.has("dados")) blocos.push({ titulo: "Dados cadastrais", pares: paresOsc(o) });
    if (marcados.has("projetos")) {
      blocos.push({
        titulo: "Projetos",
        cab: ["Título", "Status", "Início", "Fim"],
        linhas: projetos.map((p) => [p.titulo, rotulo(STATUS_PROJETO, p.status), fmtData(p.dataInicio), fmtData(p.dataFim)]),
      });
    }
    if (marcados.has("pessoas")) {
      blocos.push({ titulo: "Pessoas atendidas", pares: [["Total", String(total)]] });
      blocos.push({
        titulo: "Registros de atendimento",
        cab: ["Data", "Projeto", "Quantidade"],
        linhas: atendimentos.map((a) => [fmtData(a.data), a.projeto?.titulo ?? "—", String(a.quantidade)]),
      });
    }
  } else {
    const { projeto: p } = await api(`/projetos/${id}`);
    titulo = p.titulo;
    if (marcados.has("dados")) {
      blocos.push({
        titulo: "Dados do projeto",
        pares: [
          ["OSC", (p.organizacao?.nome ?? "Geral UOSCC")],
          ["Status", rotulo(STATUS_PROJETO, p.status)],
          ["Início", fmtData(p.dataInicio)],
          ["Fim", fmtData(p.dataFim)],
          ["Responsável", p.responsavel],
          ["Telefone", p.telefone],
          ["E-mail", p.email],
          ["Orçamento", dinheiro(p.orcamento)],
          ["Descrição", p.descricao],
        ],
      });
    }
    if (marcados.has("resultados")) {
      blocos.push({
        titulo: "Objetivo e resultados",
        pares: [
          ["Objetivo", p.objetivo],
          ["Resultados", p.resultados],
        ],
      });
    }
    if (marcados.has("pessoas")) {
      blocos.push({ titulo: "Pessoas atendidas", pares: [["Total", String(p.totalAtendidos)]] });
      blocos.push({
        titulo: "Registros de atendimento",
        cab: ["Data", "Quantidade", "Descrição"],
        linhas: p.atendimentos.map((a) => [fmtData(a.data), String(a.quantidade), a.descricao ?? "—"]),
      });
    }
  }

  if (!blocos.length) return avisar("Marque ao menos uma informação.", true);
  renderRelatorio({ titulo: `Relatório — ${titulo}`, subtitulo: geradoEm(), blocos });
}

async function gerarAnual() {
  const ano = Number($("rel-ano").value);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return avisar("Informe um ano válido.", true);

  const [{ organizacoes }, { projetos }, { atendimentos, total }] = await Promise.all([
    api("/organizacoes?ativa=todas"),
    api("/projetos"),
    api(`/atendimentos?de=${ano}-01-01&ate=${ano}-12-31`),
  ]);

  const anoDe = (d) => (d ? new Date(d).getUTCFullYear() : null);
  const ativos = projetos.filter(
    (p) => anoDe(p.dataInicio ?? p.criadoEm) <= ano && (p.dataFim ? anoDe(p.dataFim) : 9999) >= ano
  );
  const concluidosAno = projetos.filter((p) => p.status === "CONCLUIDO" && anoDe(p.dataFim) === ano);

  const porOsc = new Map();
  for (const a of atendimentos) porOsc.set(a.organizacao.nome, (porOsc.get(a.organizacao.nome) ?? 0) + a.quantidade);

  renderRelatorio({
    titulo: `Relatório anual ${ano}`,
    subtitulo: geradoEm(),
    blocos: [
      {
        titulo: "Resumo",
        pares: [
          ["OSCs na rede", String(organizacoes.length)],
          ["Projetos ativos no ano", String(ativos.length)],
          ["Projetos concluídos no ano", String(concluidosAno.length)],
          ["Pessoas atendidas no ano", String(total)],
        ],
      },
      {
        titulo: "Projetos ativos no ano",
        cab: ["Título", "OSC", "Status", "Início", "Fim"],
        linhas: ativos.map((p) => [p.titulo, (p.organizacao?.nome ?? "Geral UOSCC"), rotulo(STATUS_PROJETO, p.status), fmtData(p.dataInicio), fmtData(p.dataFim)]),
      },
      {
        titulo: "Pessoas atendidas por OSC",
        cab: ["OSC", "Pessoas"],
        linhas: [...porOsc].sort((a, b) => b[1] - a[1]).map(([n, q]) => [n, String(q)]),
      },
    ],
  });
}

function baixarCsv() {
  const rel = estado.relatorio;
  if (!rel) return;
  const linhas = [[rel.titulo], [rel.subtitulo], []];
  for (const b of rel.blocos) {
    linhas.push([b.titulo], ...(b.pares ?? [b.cab, ...b.linhas]), []);
  }

  const celula = (v) => {
    let t = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };

  const csv = "\uFEFF" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `${rel.titulo.replace(/[^\p{L}\p{N}]+/gu, "-")}.csv`,
  });
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
  if (dataHoje) {
    dataHoje.textContent = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(agora);
  }
  const diaSemana = $("dia-semana");
  if (diaSemana) {
    diaSemana.textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(agora);
  }

  const botaoSair = Object.assign(document.createElement("button"), { type: "button", textContent: "Sair" });
  botaoSair.className =
    "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800";
  botaoSair.addEventListener("click", sair);
  $("botao-tema").after(botaoSair);

  document.head.append(
    Object.assign(document.createElement("style"), {
      textContent:
        "@media print { body * { visibility: hidden; } #area-relatorio, #area-relatorio * { visibility: visible; color: #000 !important; } #area-relatorio { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; } }",
    })
  );

  preencherSelect($("filtro-categoria"), CATEGORIAS_OSC, "Todas as categorias");
  preencherSelect($("osc-categoria"), CATEGORIAS_OSC, "Selecione uma categoria");
  preencherSelect($("filtro-status"), STATUS_PROJETO, "Todos os status");
  preencherSelect($("proj-status"), STATUS_PROJETO);
  demandasUI.iniciar();
  $("botao-nova-osc").hidden = !ehUoscc;
  $("botao-novo-projeto").hidden = ehAdmin;
  $("botao-editar-osc-ficha").hidden = ehAdmin;
  document.querySelectorAll('[data-menu="relatorios"], [data-secao="relatorios"]').forEach(el => el.hidden = !ehUoscc);
  document.querySelectorAll('[data-menu="demandas"], [data-secao="demandas"]').forEach(el => el.hidden = false);
  $("proj-todas").addEventListener("change", () => { $("proj-participantes").disabled = $("proj-todas").checked; });
  $("filtro-tipo-projeto").addEventListener("change", () => tentar(carregarProjetos));
  $("filtro-situacao-osc").hidden = ehOsc;
  $("filtro-situacao-osc").addEventListener("change", () => tentar(carregarOscs));

  document.addEventListener("click", (e) => {
    const botaoAcesso = e.target.closest("[data-act='aprovar'], [data-act='recusar']");
    if (botaoAcesso) {
      const item = botaoAcesso.closest("li[data-id]");
      if (!item) return;
      const id = item.dataset.id;
      if (botaoAcesso.dataset.act === "recusar") {
        abrirModalRecusa(id);
        return;
      }
      return tentar(async () => {
        if (!confirm("Confirma a aprovação desta solicitação?")) return;
        botaoAcesso.disabled = true;
        await api(`/usuarios/solicitacoes/${id}/aprovar`, { method: "PATCH" });
        avisar("Solicitação aprovada com sucesso.");
        await carregarPendentes();
      }).finally(() => {
        if (botaoAcesso.isConnected) botaoAcesso.disabled = false;
      });
    }

    const link = e.target.closest("[data-menu], [data-secao]");
    if (link) {
      e.preventDefault();
      return navegar(link.dataset.menu ?? link.dataset.secao);
    }

    const acao = e.target.closest("[data-action]")?.dataset.action;
    if (acao === "abrir-formulario-osc") abrirFormularioOsc();
    else if (acao === "editar-osc") abrirFormularioOsc(estado.oscAtual);
    else if (acao === "abrir-formulario-projeto") abrirFormularioProjeto();
    else if (acao === "abrir-formulario-demanda") abrirFormularioDemanda();
  });

  for (const [id, recarregar] of [
    ["form-pesquisa-oscs", carregarOscs],
    ["form-pesquisa-projetos", carregarProjetos],
    ["form-pesquisa-demandas", carregarDemandas],
  ]) {
    $(id).addEventListener("submit", (e) => e.preventDefault());
    $(id).addEventListener("input", debounce(() => tentar(recarregar)));
  }

  $("form-osc").addEventListener("submit", salvarOsc);
  $("form-projeto").addEventListener("submit", salvarProjeto);
  $("form-demanda").addEventListener("submit", salvarDemanda);

  ligarLista("itens-oscs", {
    ver: abrirFicha,
    editar: async (id) => abrirFormularioOsc((await api(`/organizacoes/${id}`)).organizacao),
    excluir: async (id) => {
      if (!confirm("Desativar esta OSC? Os usuários vinculados perderão acesso. Projetos e históricos serão preservados.")) return;
      await api(`/organizacoes/${id}`, { method: "DELETE" });
      avisar("OSC desativada. Histórico preservado.");
      await carregarOscs();
    },
  });

  ligarLista("itens-projetos", {
    ver: id => abrirFormularioProjeto(id, true),
    editar: abrirFormularioProjeto,
    excluir: async (id) => {
      if (!confirm("Excluir este projeto?")) return;
      await api(`/projetos/${id}`, { method: "DELETE" });
      avisar("Projeto excluído.");
      await carregarProjetos();
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
if (token && usuario) {
  const { prepararEquipe } = await import("./assets/equipe.js");
  prepararEquipe(usuario, api, avisar);
}
