import test from "node:test";
import assert from "node:assert/strict";
import { podeGerenciarUsuarios, podeEditarOsc, podeConsultarProjeto, podeEditarProjeto, podeExcluirProjeto } from "../src/utils/permissoes.js";
const admin = { papel: "ADMIN" };
const uoscc = { papel: "RESPONSAVEL_UOSCC" };
const osc = { papel: "RESPONSAVEL_OSC", organizacaoId: 1 };
const outra = { papel: "RESPONSAVEL_OSC", organizacaoId: 2 };
const geral = { tipo: "GERAL", organizacaoId: null };
const especifico = { tipo: "ESPECIFICO", organizacaoId: 1 };

test("ADMIN administra acessos, sem editar dados operacionais", () => {
  assert.equal(podeGerenciarUsuarios(admin), true);
  assert.equal(podeEditarOsc(admin, 1), false);
  assert.equal(podeConsultarProjeto(admin, geral), true);
  assert.equal(podeConsultarProjeto(admin, especifico), true);
  for (const p of [geral, especifico]) {
    assert.equal(podeEditarProjeto(admin, p), false);
    assert.equal(podeExcluirProjeto(admin, p), false);
  }
});
test("UOSCC gerencia OSCs e projetos gerais, sem gerir usuários ou projetos específicos", () => {
  assert.equal(podeGerenciarUsuarios(uoscc), false);
  assert.equal(podeEditarOsc(uoscc, 2), true);
  assert.equal(podeEditarProjeto(uoscc, geral), true);
  assert.equal(podeExcluirProjeto(uoscc, geral), true);
  assert.equal(podeEditarProjeto(uoscc, especifico), false);
  assert.equal(podeExcluirProjeto(uoscc, especifico), false);
});
test("OSC tem escopo próprio, e consulta gerais sem editá-los", () => {
  assert.equal(podeEditarOsc(osc, 1), true);
  assert.equal(podeEditarOsc(osc, 2), false);
  assert.equal(podeConsultarProjeto(osc, geral), true);
  assert.equal(podeEditarProjeto(osc, geral), false);
  assert.equal(podeEditarProjeto(osc, especifico), true);
  assert.equal(podeConsultarProjeto(outra, especifico), false);
  assert.equal(podeEditarProjeto(outra, especifico), false);
  assert.equal(podeExcluirProjeto(osc, especifico), false);
  assert.equal(podeGerenciarUsuarios({ ...osc, dono: true }), false);
});
test("ausência de vínculo e perfis antigos não concedem permissões", () => {
  for (const u of [null, { papel: "GESTOR" }, { papel: "MEMBRO" }, { papel: "RESPONSAVEL_OSC" }]) {
    assert.equal(podeGerenciarUsuarios(u), false);
    assert.equal(podeEditarOsc(u, 1), false);
    assert.equal(podeConsultarProjeto(u, especifico), false);
    assert.equal(podeEditarProjeto(u, especifico), false);
  }
});
