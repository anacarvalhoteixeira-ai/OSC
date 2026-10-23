import {
  $, api, CATEGORIAS_OSC, estado, esc, ir, qs, rotulo, STATUS_DEMANDA,
  STATUS_PROJETO,
} from "../../shared.js";
import { abrirFormularioOsc } from "../cadastro-osc/script.js";

export const paresOsc = (organizacao) => [
  ["CNPJ", organizacao.cnpj],
  ["Categoria", rotulo(CATEGORIAS_OSC, organizacao.categoria)],
  ["Endereço", [organizacao.endereco, organizacao.bairro].filter(Boolean).join(" — ")],
  ["Responsável", organizacao.responsavel],
  ["Telefone", organizacao.telefone],
  ["E-mail", organizacao.email],
  ["Descrição", organizacao.descricao],
];

export async function abrirFicha(id) {
  const [{ organizacao }, { total }] = await Promise.all([
    api("/organizacoes/" + id),
    api("/atendimentos" + qs({ organizacaoId: id })),
  ]);
  estado.oscAtual = organizacao;
  $("ficha-osc-nome").textContent = organizacao.nome;
  $("ficha-osc-categoria").textContent = rotulo(CATEGORIAS_OSC, organizacao.categoria);
  $("ficha-osc-dados").innerHTML = paresOsc(organizacao).map(([chave, valor]) =>
    "<div><dt class=\"font-medium text-slate-500 dark:text-slate-400\">"
    + esc(chave) + "</dt><dd>" + esc(valor || "—") + "</dd></div>"
  ).join("");
  $("ficha-osc-pessoas").textContent = total;

  const linha = (titulo, status) =>
    '<li class="flex justify-between gap-3"><span>' + esc(titulo)
    + '</span><span class="text-xs">' + esc(status) + "</span></li>";
  $("ficha-osc-projetos").innerHTML = organizacao.projetos.map((projeto) =>
    linha(projeto.titulo, rotulo(STATUS_PROJETO, projeto.status))
  ).join("");
  $("ficha-osc-sem-projetos").classList.toggle("hidden", organizacao.projetos.length > 0);
  $("ficha-osc-demandas").innerHTML = organizacao.demandas.map((demanda) =>
    linha(demanda.titulo, rotulo(STATUS_DEMANDA, demanda.status))
  ).join("");
  $("ficha-osc-sem-demandas").classList.toggle("hidden", organizacao.demandas.length > 0);
  ir("ficha-osc");
}

export function inicializarFichaOsc() {
  $("botao-editar-osc-ficha").addEventListener("click", () =>
    abrirFormularioOsc(estado.oscAtual));
}
