import test from "node:test";
import assert from "node:assert/strict";
import { escopoPessoas, schemaPessoa } from "../src/utils/pessoa-atendida.js";

test("pessoas atendidas: somente a UOSCC consulta todas as OSCs", () => {
  assert.deepEqual(escopoPessoas({ papel: "RESPONSAVEL_UOSCC" }), {});
  assert.deepEqual(escopoPessoas({ papel: "RESPONSAVEL_OSC", organizacaoId: 7 }), { organizacaoId: 7 });
  for (const u of [null, { papel: "ADMIN" }, { papel: "RESPONSAVEL_OSC" }, { papel: "GESTOR" }]) assert.equal(escopoPessoas(u), null);
});

test("pessoas atendidas: valida datas reais e rejeita transferência de vínculo", () => {
  const dados = { nome: "Maria Silva", tipo: "ALUNO", dataNascimento: "2020-02-29" };
  assert.equal(schemaPessoa.safeParse(dados).success, true);
  for (const dataNascimento of ["2025-02-29", "2020-02-30", "2020-13-01", "2999-01-01", "1899-01-01"]) {
    assert.equal(schemaPessoa.safeParse({ ...dados, dataNascimento }).success, false, dataNascimento);
  }
  assert.equal(schemaPessoa.safeParse({ ...dados, organizacaoId: 2 }).success, false);
  assert.equal(schemaPessoa.partial().safeParse({ organizacaoId: 2 }).success, false);
  assert.equal(schemaPessoa.safeParse({ ...dados, tipo: "ADMIN" }).success, false);
});
