import {
  $, api, avisar, ehOsc, esc, fmtData, podeExcluir, rotulo, STATUS_DEMANDA,
  tentar,
} from "../../shared.js";

export async function carregarInicio() {
  let pessoas;
  let oscs;
  let abertas;
  let lista;
  if (!ehOsc) {
    const { painel } = await api("/painel");
    pessoas = painel.totais.pessoasAtendidas;
    oscs = painel.totais.organizacoes;
    abertas = (painel.demandasPorStatus.ABERTA ?? 0)
      + (painel.demandasPorStatus.EM_ANALISE ?? 0);
    lista = painel.demandasEmAberto;
  } else {
    const [{ total }, { demandas }] = await Promise.all([
      api("/atendimentos"), api("/demandas"),
    ]);
    const emAberto = demandas.filter((demanda) =>
      ["ABERTA", "EM_ANALISE"].includes(demanda.status));
    pessoas = total;
    oscs = 1;
    abertas = emAberto.length;
    lista = emAberto.slice(0, 5);
  }

  $("numeracao-pessoas").textContent = pessoas;
  $("total-oscs").textContent = oscs;
  $("total-demandas").textContent = abertas;

  const container = $("lista-lembretes");
  container.replaceChildren();
  if (!lista.length) {
    const vazio = document.createElement("p");
    vazio.className = "text-sm text-slate-500 dark:text-slate-400";
    vazio.textContent = "Nenhuma demanda em aberto no momento.";
    container.append(vazio);
  } else {
    const grade = document.createElement("ul");
    grade.className = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";
    for (const demanda of lista) {
      const cartao = document.createElement("li");
      cartao.className = "flex min-h-36 flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800";
      const conteudo = document.createElement("div");
      const titulo = document.createElement("p");
      titulo.className = "font-semibold text-slate-900 dark:text-white";
      titulo.textContent = demanda.titulo;
      const organizacao = document.createElement("p");
      organizacao.className = "mt-1 text-xs text-slate-500 dark:text-slate-400";
      organizacao.textContent = demanda.organizacao?.nome ?? "Rede";
      conteudo.append(titulo, organizacao);

      const detalhes = document.createElement("div");
      detalhes.className = "flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700";
      const status = document.createElement("span");
      status.className = "rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-400/10 dark:text-orange-300";
      status.textContent = rotulo(STATUS_DEMANDA, demanda.status);
      const prazo = document.createElement("span");
      prazo.className = "text-xs text-slate-500 dark:text-slate-400";
      prazo.textContent = demanda.prazo
        ? "Prazo: " + fmtData(demanda.prazo)
        : "Sem prazo definido";
      detalhes.append(status, prazo);
      cartao.append(conteudo, detalhes);
      grade.append(cartao);
    }
    container.append(grade);
  }
  if (podeExcluir) await carregarPendentes();
}

async function carregarPendentes() {
  const { usuarios } = await api("/usuarios?ativo=false");
  const painel = $("painel-solicitacoes-acesso");
  painel.classList.toggle("hidden", usuarios.length === 0);
  $("total-pendentes").textContent = usuarios.length;
  $("lista-pendentes").innerHTML = usuarios.map((usuario) =>
    '<li data-id="' + usuario.id + '" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-900 dark:bg-slate-900">'
    + '<span class="font-medium">' + esc(usuario.nome)
    + ' <span class="block text-xs font-normal text-slate-500 dark:text-slate-400">'
    + esc(usuario.email) + " · " + esc(usuario.organizacao?.nome ?? "sem OSC")
    + '</span></span><button type="button" data-act="aprovar" class="btn-primario px-3 py-2">Aprovar acesso</button></li>'
  ).join("");
}

export function inicializarInicio() {
  $("lista-pendentes").addEventListener("click", (event) => {
    const botao = event.target.closest("[data-act='aprovar']");
    if (!botao) return;
    tentar(async () => {
      await api("/usuarios/" + botao.closest("li").dataset.id + "/aprovar", {
        method: "PATCH",
      });
      avisar("Acesso aprovado.");
      await carregarPendentes();
    });
  });
}
