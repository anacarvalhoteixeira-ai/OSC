import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import prisma from "../src/config/prisma.js";
process.env.NODE_ENV = "test";
const { app } = await import("../server.js");

test("pessoas atendidas: isolamento por OSC, consulta pela UOSCC e preservação dos cadastros", async () => {
  const servidor = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { servidor.once("listening", resolve); servidor.once("error", reject); });
  const base = `http://127.0.0.1:${servidor.address().port}/api/pessoas-atendidas`;
  const tag = `pessoas-teste-${Date.now()}`;
  const orgs = [], usuarios = [];
  async function req(usuario, caminho = "", method = "GET", corpo) {
    const token = usuario && jwt.sign({}, process.env.JWT_SECRET, { subject: String(usuario.id), expiresIn: "5m" });
    const r = await fetch(base + caminho, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    return { status: r.status, dados: await r.json() };
  }
  async function usuario(papel, organizacaoId) {
    const u = await prisma.usuario.create({ data: { nome: tag, email: `${tag}-${usuarios.length}@example.test`, senha: "sem-login-por-senha", papel, organizacaoId } });
    usuarios.push(u.id); return u;
  }
  try {
    for (let i = 0; i < 2; i++) orgs.push((await prisma.organizacao.create({ data: { nome: `${tag}-${i}` } })).id);
    const a = await usuario("RESPONSAVEL_OSC", orgs[0]);
    const b = await usuario("RESPONSAVEL_OSC", orgs[1]);
    const uoscc = await usuario("RESPONSAVEL_UOSCC");
    const admin = await usuario("ADMIN");
    const dados = { nome: `${tag} Maria`, tipo: "ALUNO", dataNascimento: "2015-06-10", telefone: "71999999999", responsavel: "Responsável teste" };
    assert.equal((await req(null)).status, 401);
    assert.equal((await req(admin)).status, 403);
    assert.equal((await req(uoscc, "", "POST", dados)).status, 403);
    assert.equal((await req(a, "", "POST", { ...dados, organizacaoId: orgs[1] })).status, 400);
    assert.equal((await req(a, "", "POST", { ...dados, dataNascimento: "2023-02-30" })).status, 400);
    const criado = await req(a, "", "POST", dados);
    assert.equal(criado.status, 201, JSON.stringify(criado.dados));
    const id = criado.dados.pessoa.id;
    assert.equal(criado.dados.pessoa.organizacaoId, orgs[0]);
    assert.equal(criado.dados.pessoa.dataNascimento.slice(0, 10), dados.dataNascimento);
    const outro = await req(b, "", "POST", { nome: `${tag} José`, tipo: "BENEFICIARIO" });
    assert.equal(outro.status, 201);
    assert.equal((await req(a, `/${outro.dados.pessoa.id}`)).status, 404);
    assert.equal((await req(b, `/${id}`, "PATCH", { nome: "Tentativa" })).status, 404);
    assert.equal((await req(a, `/${id}`, "PATCH", { organizacaoId: orgs[1] })).status, 400);
    assert.equal((await req(uoscc, `/${id}`, "PATCH", { ativo: false })).status, 403);
    assert.equal((await req(uoscc, `/${id}`)).status, 200);
    const listaOsc = await req(a, `?organizacaoId=${orgs[1]}&busca=${tag}`);
    assert.deepEqual(listaOsc.dados.pessoas.map(p => p.id), [id]);
    assert.equal((await req(uoscc, `?busca=${tag}`)).dados.total, 2);
    assert.equal((await req(uoscc, `?busca=${tag}&tipo=ALUNO`)).dados.total, 1);
    assert.equal((await req(a, `/${id}`, "PATCH", { telefone: null, ativo: false })).status, 200);
    assert.equal((await req(a, `?busca=${tag}`)).dados.total, 0);
    assert.equal((await req(a, `?busca=${tag}&ativo=false`)).dados.total, 1);
    assert.equal((await req(a, `/${id}`, "PATCH", { ativo: true })).status, 200);
    await prisma.organizacao.update({ where: { id: orgs[0] }, data: { ativa: false } });
    assert.equal((await req(a)).status, 403);
    assert.equal((await req(uoscc, `/${id}`)).status, 200);
    assert.equal((await prisma.pessoaAtendida.findUnique({ where: { id } })).nome, dados.nome);
  } finally {
    try {
      await prisma.pessoaAtendida.deleteMany({ where: { organizacaoId: { in: orgs } } });
      await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } });
      await prisma.organizacao.deleteMany({ where: { id: { in: orgs } } });
    } finally {
      await new Promise(resolve => servidor.close(resolve));
      await prisma.$disconnect();
    }
  }
});
