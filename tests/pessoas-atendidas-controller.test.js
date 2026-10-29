import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
// Estes testes substituem todas as operações e não conectam ao banco.
process.env.DATABASE_URL ||= "mysql://teste:teste@127.0.0.1:3306/teste";
const { default: prisma } = await import("../src/config/prisma.js");
const { listar, atualizar, criar, obter } = await import("../src/controllers/pessoa-atendida.controller.js");

const resposta = () => ({ statusCode: 200, status(codigo) { this.statusCode = codigo; return this; }, json(dados) { this.dados = dados; return this; } });
function substituir(t, alvo, metodo, implementacao) {
  const original = alvo[metodo];
  alvo[metodo] = t.mock.fn(implementacao);
  t.after(() => { alvo[metodo] = original; });
}
const usuario = { papel: "RESPONSAVEL_OSC", organizacaoId: 7 };

test("API não usa a OSC enviada na query para ampliar o escopo", async t => {
  let filtro;
  substituir(t, prisma.pessoaAtendida, "findMany", args => { filtro = args.where; return []; });
  substituir(t, prisma.pessoaAtendida, "count", args => { assert.equal(args.where.organizacaoId, 7); return 0; });
  substituir(t, prisma, "$transaction", async operacoes => Promise.all(operacoes));
  const res = resposta();
  await listar({ usuario, query: { organizacaoId: "999", ativo: "todos" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(filtro.organizacaoId, 7);
});

test("UOSCC consulta sem escopo de OSC e pode filtrar organizações", async t => {
  const filtros = [];
  substituir(t, prisma.pessoaAtendida, "findMany", args => { filtros.push(args.where); return []; });
  substituir(t, prisma.pessoaAtendida, "count", () => 0);
  substituir(t, prisma, "$transaction", async operacoes => Promise.all(operacoes));
  const usuario = { papel: "RESPONSAVEL_UOSCC" };
  await listar({ usuario, query: {} }, resposta());
  await listar({ usuario, query: { organizacaoId: "999" } }, resposta());
  assert.equal(filtros[0].organizacaoId, undefined);
  assert.equal(filtros[1].organizacaoId, 999);
});

test("edição e consulta por ID restringem a OSC dentro da operação no banco", async t => {
  substituir(t, prisma.pessoaAtendida, "update", async args => {
    assert.deepEqual(args.where, { id: 10, organizacaoId: 7 });
    throw Object.assign(new Error("Não encontrado"), { code: "P2025" });
  });
  substituir(t, prisma.pessoaAtendida, "findFirst", async args => {
    assert.deepEqual(args.where, { id: 10, organizacaoId: 7 });
    return null;
  });
  const res = resposta();
  await atualizar({ usuario, params: { id: "10" }, body: { ativo: false } }, res);
  assert.equal(res.statusCode, 404);
  const consulta = resposta();
  await obter({ usuario, params: { id: "10" } }, consulta);
  assert.equal(consulta.statusCode, 404);
});

test("cadastro usa o vínculo da sessão e converte nascimento sem trocar o dia", async t => {
  substituir(t, prisma.pessoaAtendida, "create", async ({ data }) => {
    assert.equal(data.organizacaoId, 7);
    assert.equal(data.dataNascimento.toISOString(), "2015-06-10T00:00:00.000Z");
    return { id: 1, ...data };
  });
  const res = resposta();
  await criar({ usuario, body: { nome: "Maria", tipo: "ALUNO", dataNascimento: "2015-06-10" } }, res);
  assert.equal(res.statusCode, 201);
  const invalido = resposta();
  await criar({ usuario, body: { nome: "Maria", tipo: "ALUNO", organizacaoId: 999 } }, invalido);
  assert.equal(invalido.statusCode, 400);
});
