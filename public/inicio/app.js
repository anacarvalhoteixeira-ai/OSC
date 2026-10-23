import { $, configurarNavegacao, sair, tentar, token, usuario } from "./shared.js";
import { carregarInicio, inicializarInicio } from "./telas/inicio/script.js";
import { carregarOscs, inicializarOscs } from "./telas/oscs/script.js";
import { inicializarFichaOsc } from "./telas/ficha-osc/script.js";
import { inicializarCadastroOsc } from "./telas/cadastro-osc/script.js";
import { carregarProjetos, inicializarProjetos } from "./telas/projetos/script.js";
import { inicializarCadastroProjeto } from "./telas/cadastro-projeto/script.js";
import { carregarDemandas, inicializarDemandas } from "./telas/demandas/script.js";
import { inicializarCadastroDemanda } from "./telas/cadastro-demanda/script.js";
import { prepararRelatorios, inicializarRelatorios } from "./telas/relatorios/script.js";

const PRINCIPAIS = ["inicio", "oscs", "projetos", "demandas", "relatorios"];
const MENU_DE = {
  "ficha-osc": "oscs",
  "cadastro-osc": "oscs",
  "cadastro-projeto": "projetos",
  "cadastro-demanda": "demandas",
};

function ir(nome) {
  document.querySelectorAll("[data-pagina]").forEach((pagina) => {
    pagina.classList.toggle("hidden", pagina.id !== "pagina-" + nome);
  });
  const menu = MENU_DE[nome] ?? nome;
  document.querySelectorAll(".menu-link").forEach((link) => {
    const ativo = link.dataset.menu === menu;
    link.setAttribute("aria-current", ativo ? "page" : "false");
    link.classList.toggle("border-orange-400", ativo);
    link.classList.toggle("bg-orange-400", ativo);
    link.classList.toggle("text-slate-950", ativo);
    link.classList.toggle("font-semibold", ativo);
    link.classList.toggle("text-blue-100", !ativo);
    link.classList.toggle("hover:bg-white/10", !ativo);
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

configurarNavegacao(ir);

function navegar(nome) {
  if (location.hash === "#" + nome) ir(nome);
  else location.hash = nome;
}

function paginaDaHash() {
  const pagina = location.hash.slice(1);
  return PRINCIPAIS.includes(pagina) ? pagina : "inicio";
}

function aplicarTema(escuro) {
  document.documentElement.classList.toggle("dark", escuro);
  $("icone-tema").textContent = escuro ? "☀️" : "🌙";
  $("texto-tema").textContent = escuro ? "Modo claro" : "Modo escuro";
}

function iniciar() {
  const saudacao = $("boas-vindas");
  if (saudacao && usuario?.nome) saudacao.textContent = "Olá, " + usuario.nome;
  const temaSalvo = localStorage.getItem("uoscc_tema");
  aplicarTema(temaSalvo
    ? temaSalvo === "escuro"
    : matchMedia("(prefers-color-scheme: dark)").matches);
  $("botao-tema").addEventListener("click", () => {
    const escuro = !document.documentElement.classList.contains("dark");
    localStorage.setItem("uoscc_tema", escuro ? "escuro" : "claro");
    aplicarTema(escuro);
  });

  const agora = new Date();
  const dataHoje = $("data-hoje");
  if (dataHoje) dataHoje.textContent = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  }).format(agora);
  const diaSemana = $("dia-semana");
  if (diaSemana) diaSemana.textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
  }).format(agora);

  const botaoSair = Object.assign(document.createElement("button"), {
    type: "button", textContent: "Sair",
  });
  botaoSair.className = "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800";
  botaoSair.addEventListener("click", sair);
  $("botao-tema").after(botaoSair);

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-menu], [data-secao]");
    if (!link) return;
    event.preventDefault();
    navegar(link.dataset.menu ?? link.dataset.secao);
  });

  inicializarInicio();
  inicializarOscs();
  inicializarFichaOsc();
  inicializarCadastroOsc();
  inicializarProjetos();
  inicializarCadastroProjeto();
  inicializarDemandas();
  inicializarCadastroDemanda();
  inicializarRelatorios();

  window.addEventListener("hashchange", () => ir(paginaDaHash()));
  ir(paginaDaHash());
}

if (!token || !usuario) sair();
else iniciar();
