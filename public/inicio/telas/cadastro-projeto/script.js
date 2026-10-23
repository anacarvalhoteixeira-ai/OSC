import {
  $, api, avisar, carregarListaOscs, ehOsc, ir, nuloSeVazio, paraInput,
  preencherOscs, preencherSelect, STATUS_PROJETO, tentar,
} from "../../shared.js";

export async function abrirFormularioProjeto(id) {
  await carregarListaOscs();
  const formulario = $("form-projeto");
  formulario.reset();
  preencherOscs($("proj-osc"), $("aviso-sem-oscs"));
  $("titulo-form-projeto").textContent = id ? "Editar projeto" : "Cadastrar projeto";
  $("proj-id").value = id ?? "";
  if (id) {
    const { projeto } = await api("/projetos/" + id);
    formulario.elements.osc_id.value = projeto.organizacaoId;
    for (const campo of [
      "titulo", "responsavel", "telefone", "email", "status", "descricao",
      "objetivo", "resultados",
    ]) formulario.elements[campo].value = projeto[campo] ?? "";
    formulario.elements.data_inicio.value = paraInput(projeto.dataInicio);
    formulario.elements.data_fim.value = paraInput(projeto.dataFim);
    formulario.elements.pessoas_atendidas.value = projeto.totalAtendidos || "";
    formulario.elements.orcamento.value = projeto.orcamento ?? "";
  }
  ir("cadastro-projeto");
}

async function ajustarAtendidos(projeto, alvo) {
  const { projeto: atual } = await api("/projetos/" + projeto.id);
  const diferenca = alvo - atual.totalAtendidos;
  if (diferenca === 0) return;
  const ultimo = atual.atendimentos[0];
  if (ultimo && ultimo.quantidade + diferenca > 0) {
    await api("/atendimentos/" + ultimo.id, {
      method: "PUT",
      corpo: { quantidade: ultimo.quantidade + diferenca },
    });
  } else if (!ultimo && diferenca > 0) {
    await api("/atendimentos", {
      method: "POST",
      corpo: {
        organizacaoId: projeto.organizacaoId,
        projetoId: projeto.id,
        quantidade: diferenca,
        descricao: "Informado no cadastro do projeto",
      },
    });
  } else {
    throw new Error("Projeto salvo, mas não foi possível reduzir automaticamente o total de pessoas. Ajuste os registros de atendimento.");
  }
}

export async function salvarProjeto(event) {
  event.preventDefault();
  const valores = Object.fromEntries(new FormData(event.currentTarget));
  const id = $("proj-id").value;
  const pessoas = valores.pessoas_atendidas === ""
    ? null
    : Number(valores.pessoas_atendidas);
  if (pessoas !== null && (!Number.isInteger(pessoas) || pessoas < 0)) {
    avisar("Informe um número inteiro de pessoas atendidas.", true);
    return;
  }

  const dados = {
    titulo: valores.titulo.trim(),
    organizacaoId: Number(valores.osc_id),
    status: valores.status,
    descricao: nuloSeVazio(valores.descricao),
    objetivo: nuloSeVazio(valores.objetivo),
    resultados: nuloSeVazio(valores.resultados),
    responsavel: nuloSeVazio(valores.responsavel),
    telefone: nuloSeVazio(valores.telefone),
    email: valores.email.trim(),
    dataInicio: valores.data_inicio || null,
    dataFim: valores.data_fim || null,
    orcamento: valores.orcamento === "" ? null : Number(valores.orcamento),
  };
  if (ehOsc) delete dados.organizacaoId;
  const { projeto } = await api(id ? "/projetos/" + id : "/projetos", {
    method: id ? "PUT" : "POST",
    corpo: dados,
  });
  if (pessoas !== null) await ajustarAtendidos(projeto, pessoas);
  avisar("Projeto salvo com sucesso.");
  ir("projetos");
}

export function inicializarCadastroProjeto() {
  preencherSelect($("proj-status"), STATUS_PROJETO);
  $("form-projeto").addEventListener("submit", (event) =>
    tentar(() => salvarProjeto(event)));
}
