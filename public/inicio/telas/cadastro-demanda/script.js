import {
  $, api, avisar, carregarListaOscs, CATEGORIAS_DEMANDA, ehOsc, ir,
  nuloSeVazio, paraInput, preencherOscs, preencherSelect, STATUS_DEMANDA,
} from "../../shared.js";

export function alternarConclusao() {
  $("bloco-dem-conclusao").classList.toggle(
    "hidden", $("dem-status").value !== "ATENDIDA",
  );
}

export async function abrirFormularioDemanda(id) {
  await carregarListaOscs();
  const formulario = $("form-demanda");
  formulario.reset();
  preencherOscs($("dem-osc"), $("aviso-sem-oscs-demanda"));
  $("titulo-form-demanda").textContent = id ? "Editar demanda" : "Cadastrar demanda";
  $("dem-id").value = id ?? "";
  formulario.elements.status.disabled = ehOsc;
  if (id) {
    const { demanda } = await api("/demandas/" + id);
    if (demanda.organizacaoId) formulario.elements.osc_id.value = demanda.organizacaoId;
    for (const campo of ["titulo", "categoria", "status", "descricao", "resultado"]) {
      formulario.elements[campo].value = demanda[campo] ?? "";
    }
    formulario.elements.prazo.value = paraInput(demanda.prazo);
    formulario.elements.data_conclusao.value = paraInput(demanda.dataConclusao);
  }
  alternarConclusao();
  ir("cadastro-demanda");
}

export async function salvarDemanda(event) {
  event.preventDefault();
  const valores = Object.fromEntries(new FormData(event.currentTarget));
  const id = $("dem-id").value;
  const dados = {
    titulo: valores.titulo.trim(),
    descricao: valores.descricao.trim() || valores.titulo.trim(),
    categoria: valores.categoria || "OUTROS",
    organizacaoId: valores.osc_id ? Number(valores.osc_id) : null,
    prazo: valores.prazo || null,
    ...(valores.status !== undefined && {
      status: valores.status,
      dataConclusao: valores.status === "ATENDIDA" ? valores.data_conclusao || null : null,
      resultado: nuloSeVazio(valores.resultado),
    }),
  };
  if (ehOsc && id) delete dados.organizacaoId;
  await api(id ? "/demandas/" + id : "/demandas", {
    method: id ? "PUT" : "POST",
    corpo: dados,
  });
  avisar("Demanda salva com sucesso.");
  ir("demandas");
}

export function inicializarCadastroDemanda() {
  preencherSelect($("dem-status"), STATUS_DEMANDA);
  preencherSelect($("dem-categoria"), CATEGORIAS_DEMANDA, "Selecione (opcional)");
  $("form-demanda").addEventListener("submit", (event) =>
    salvarDemanda(event).catch((erro) =>
      avisar(erro.message || "Não foi possível salvar a demanda.", true)));
  $("dem-status").addEventListener("change", alternarConclusao);
}
