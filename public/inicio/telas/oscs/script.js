import {
  $, api, avisar, botoesItem, carregarListaOscs, CATEGORIAS_OSC, classeItem,
  debounce, ehOsc, esc, infoItem, ligarLista, preencherSelect, qs, rotulo,
  tentar,
} from "../../shared.js";
import { abrirFormularioOsc } from "../cadastro-osc/script.js";
import { abrirFicha } from "../ficha-osc/script.js";

export async function carregarOscs() {
  const formulario = $("form-pesquisa-oscs");
  let organizacoes;
  if (ehOsc) {
    await carregarListaOscs();
    const { estado } = await import("../../shared.js");
    organizacoes = estado.oscs;
  } else {
    ({ organizacoes } = await api("/organizacoes" + qs({
      busca: formulario.busca.value.trim(),
      categoria: formulario.categoria.value,
    })));
  }
  $("itens-oscs").innerHTML = organizacoes.map((organizacao) =>
    '<li data-id="' + organizacao.id + '" class="' + classeItem + '">'
    + infoItem(organizacao.nome,
      esc(rotulo(CATEGORIAS_OSC, organizacao.categoria))
      + " · " + esc(organizacao.cnpj)
      + " · " + esc(organizacao.responsavel)
      + " · " + esc(organizacao.telefone))
    + botoesItem('<button type="button" data-act="ver" class="btn-secundario px-3 py-2">Ver ficha</button>')
    + "</li>"
  ).join("");
  $("sem-oscs").classList.toggle("hidden", organizacoes.length > 0);
}

export function inicializarOscs() {
  const formulario = $("form-pesquisa-oscs");
  preencherSelect($("filtro-categoria"), CATEGORIAS_OSC, "Todas as categorias");
  formulario.addEventListener("submit", (event) => event.preventDefault());
  formulario.addEventListener("input", debounce(() => tentar(carregarOscs)));
  const botaoNova = $("botao-nova-osc");
  if (ehOsc) botaoNova.classList.add("hidden");
  else botaoNova.addEventListener("click", () => abrirFormularioOsc());

  ligarLista("itens-oscs", {
    ver: abrirFicha,
    editar: async (id) => {
      const { organizacao } = await api("/organizacoes/" + id);
      abrirFormularioOsc(organizacao);
    },
    excluir: async (id) => {
      if (!confirm("Excluir esta OSC? Só é possível se ela não tiver projetos, demandas ou atendimentos.")) return;
      await api("/organizacoes/" + id, { method: "DELETE" });
      avisar("OSC excluída.");
      await carregarOscs();
    },
  });
}
