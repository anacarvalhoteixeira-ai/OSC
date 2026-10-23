import {
  $, api, avisar, botoesItem, classeItem, CATEGORIAS_DEMANDA, debounce,
  esc, infoItem, ligarLista, qs, rotulo, STATUS_DEMANDA,
  STATUS_DEMANDA_FILTRO, tentar, preencherSelect,
} from "../../shared.js";
import { abrirFormularioDemanda } from "../cadastro-demanda/script.js";

export async function carregarDemandas() {
  const formulario = $("form-pesquisa-demandas");
  const { demandas } = await api("/demandas" + qs({
    busca: formulario.busca.value.trim(),
    status: formulario.status.value,
  }));
  const hoje = new Date().toISOString().slice(0, 10);
  const coresStatus = {
    ABERTA: "bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300",
    EM_ANALISE: "bg-sky-100 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300",
    ATENDIDA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
    RECUSADA: "bg-rose-100 text-rose-800 dark:bg-rose-400/10 dark:text-rose-300",
  };
  const itens = demandas.map((demanda) => {
    const atrasada = demanda.status !== "ATENDIDA"
      && demanda.prazo && demanda.prazo.slice(0, 10) < hoje;
    const prazo = demanda.status === "ATENDIDA"
      ? "Concluída" + (demanda.dataConclusao ? " em " + formatarData(demanda.dataConclusao) : "")
      : demanda.prazo
        ? (atrasada ? "Atrasada: " : "Prazo: ") + formatarData(demanda.prazo)
        : "Sem prazo definido";
    const categoria = CATEGORIAS_DEMANDA[demanda.categoria]
      ?? demanda.categoria ?? "—";
    const subtitulo = esc(demanda.organizacao?.nome ?? "Rede")
      + " | " + esc(categoria);
    const item = document.createElement("li");
    item.dataset.id = demanda.id;
    item.className = classeItem + " min-h-56 flex-col items-stretch justify-between gap-4";
    item.innerHTML = infoItem(demanda.titulo, subtitulo);
    item.firstElementChild.classList.add("min-w-0", "flex-1");

    const detalhes = document.createElement("div");
    detalhes.className = "mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700";
    const status = document.createElement("span");
    status.className = "rounded-full px-3 py-1 text-xs font-bold "
      + (coresStatus[demanda.status] ?? "bg-slate-100 text-slate-700");
    status.textContent = rotulo(STATUS_DEMANDA, demanda.status);
    const data = document.createElement("span");
    data.className = "rounded-full px-3 py-1 text-xs font-semibold "
      + (atrasada
        ? "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300"
        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300");
    data.textContent = prazo;
    detalhes.append(status, data);
    detalhes.insertAdjacentHTML("beforeend", botoesItem());
    item.append(detalhes);
    return item;
  });
  $("itens-demandas").replaceChildren(...itens);
  $("sem-demandas").classList.toggle("hidden", demandas.length > 0);
}

function formatarData(valor) {
  return valor
    ? new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC" })
    : "—";
}

export function inicializarDemandas() {
  const formulario = $("form-pesquisa-demandas");
  preencherSelect($("filtro-status-demanda"), STATUS_DEMANDA_FILTRO, "Todos os status");
  formulario.addEventListener("submit", (event) => event.preventDefault());
  formulario.addEventListener("input", debounce(() => tentar(carregarDemandas)));
  $("botao-nova-demanda").addEventListener("click", () =>
    tentar(() => abrirFormularioDemanda()));

  ligarLista("itens-demandas", {
    editar: abrirFormularioDemanda,
    excluir: async (id) => {
      if (!confirm("Excluir esta demanda?")) return;
      await api("/demandas/" + id, { method: "DELETE" });
      avisar("Demanda excluída.");
      await carregarDemandas();
    },
  });
}
