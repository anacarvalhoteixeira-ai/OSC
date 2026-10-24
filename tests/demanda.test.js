import test from "node:test";
import assert from "node:assert/strict";
import { podeConsultarDemanda, podeEditarDemanda, podeAtenderDemanda } from "../src/utils/demanda.js";
const osc = { papel: "RESPONSAVEL_OSC", organizacaoId: 1 };
const demanda = { organizacaoId: 1, status: "ABERTA" };

test("somente a OSC vinculada edita e apenas enquanto aberta", () => {
  assert.equal(podeEditarDemanda(osc, demanda), true);
  for (const status of ["EM_ANALISE", "ATENDIDA", "RECUSADA"]) assert.equal(podeEditarDemanda(osc, { ...demanda, status }), false);
  for (const u of [null, { papel: "ADMIN" }, { papel: "RESPONSAVEL_UOSCC" }, { ...osc, organizacaoId: 2 }, { papel: "RESPONSAVEL_OSC" }]) assert.equal(podeEditarDemanda(u, demanda), false);
});
test("ADMIN e UOSCC consultam a rede; OSC consulta somente sua organização", () => {
  for (const papel of ["ADMIN", "RESPONSAVEL_UOSCC"]) assert.equal(podeConsultarDemanda({ papel }, demanda), true);
  assert.equal(podeConsultarDemanda(osc, demanda), true);
  assert.equal(podeConsultarDemanda({ ...osc, organizacaoId: 2 }, demanda), false);
  assert.equal(podeConsultarDemanda({ papel: "RESPONSAVEL_OSC" }, { organizacaoId: null }), false);
});
test("atendimento é exclusivo da UOSCC", () => {
  assert.equal(podeAtenderDemanda({ papel: "RESPONSAVEL_UOSCC" }), true);
  for (const u of [null, osc, { papel: "ADMIN" }, { papel: "GESTOR" }]) assert.equal(podeAtenderDemanda(u), false);
});
