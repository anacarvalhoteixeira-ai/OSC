import {
  $, api, avisar, botoesItem, classeItem, debounce, esc, infoItem,
  ligarLista, preencherSelect, qs, rotulo, STATUS_PROJETO, tentar,
} from "../../shared.js";
import { abrirFormularioProjeto } from "../cadastro-projeto/script.js";

export async function carregarProjetos() {
  const formulario = $("form-pesquisa-projetos");
  const { projetos } = await api("/projetos" + qs({
    busca: formulario.busca.value.trim(),
    status: formulario.status.value,
  }));
  $("itens-projetos").innerHTML = projetos.map((projeto) =>
    '<li data-id="' + projeto.id + '" class="' + classeItem + '">'
    + infoItem(projeto.titulo,
      esc(projeto.organizacao.nome)
      + " · " + esc(rotulo(STATUS_PROJETO, projeto.status))
      + " · " + formatarData(projeto.dataInicio)
      + " → " + formatarData(projeto.dataFim))
    + botoesItem()
    + "</li>"
  ).join("");
  $("sem-projetos").classList.toggle("hidden", projetos.length > 0);
}

function formatarData(valor) {
  return valor
    ? new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC" })
    : "—";
}

export function inicializarProjetos() {
  const formulario = $("form-pesquisa-projetos");
  preencherSelect($("filtro-status"), STATUS_PROJETO, "Todos os status");
  formulario.addEventListener("submit", (event) => event.preventDefault());
  formulario.addEventListener("input", debounce(() => tentar(carregarProjetos)));
  $("botao-novo-projeto").addEventListener("click", () =>
    tentar(() => abrirFormularioProjeto()));

  ligarLista("itens-projetos", {
    editar: abrirFormularioProjeto,
    excluir: async (id) => {
      if (!confirm("Excluir este projeto?")) return;
      await api("/projetos/" + id, { method: "DELETE" });
      avisar("Projeto excluído.");
      await carregarProjetos();
    },
  });
}
