import {
  $, api, avisar, CATEGORIAS_OSC, ehOsc, ir, preencherSelect, tentar,
} from "../../shared.js";

export function abrirFormularioOsc(organizacao) {
  const formulario = $("form-osc");
  formulario.reset();
  $("titulo-form-osc").textContent = organizacao ? "Editar OSC" : "Cadastrar OSC";
  $("osc-id").value = organizacao?.id ?? "";
  if (organizacao) {
    for (const campo of [
      "nome", "cnpj", "categoria", "endereco", "bairro", "responsavel",
      "telefone", "email", "descricao",
    ]) formulario.elements[campo].value = organizacao[campo] ?? "";
  }
  formulario.elements.nome.disabled = formulario.elements.cnpj.disabled
    = ehOsc && !!organizacao;
  ir("cadastro-osc");
}

export async function salvarOsc(event) {
  event.preventDefault();
  const formulario = event.currentTarget;
  const id = $("osc-id").value;
  const valores = Object.fromEntries(new FormData(formulario));
  const dados = {
    categoria: valores.categoria,
    endereco: valores.endereco.trim(),
    bairro: valores.bairro.trim(),
    responsavel: valores.responsavel.trim(),
    telefone: valores.telefone.trim(),
    email: valores.email.trim(),
    descricao: valores.descricao.trim(),
  };
  if (valores.nome !== undefined) {
    dados.nome = valores.nome.trim();
    dados.cnpj = valores.cnpj.trim();
  }
  await api(id ? "/organizacoes/" + id : "/organizacoes", {
    method: id ? "PUT" : "POST",
    corpo: dados,
  });
  avisar("OSC salva com sucesso.");
  ir("oscs");
}

export function inicializarCadastroOsc() {
  preencherSelect($("osc-categoria"), CATEGORIAS_OSC, "Selecione uma categoria");
  $("form-osc").addEventListener("submit", (event) =>
    tentar(() => salvarOsc(event)));
}
