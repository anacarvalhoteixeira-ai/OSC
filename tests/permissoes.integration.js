import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../src/config/prisma.js";

process.env.NODE_ENV = "test";
const { app } = await import("../server.js");

test("API: três perfis, isolamento por OSC, aprovação, projetos e exclusão lógica", async t => {
  const servidor = app.listen(0, "127.0.0.1");
  await new Promise(resolve => servidor.once("listening", resolve));
  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  const tag = `teste-${Date.now()}`;
  const senha = "Teste-Acesso-2026!";
  const hash = await bcrypt.hash(senha, 4);
  const orgIds = [], userIds = [], projetoIds = [], solIds = [];
  async function req(usuario, caminho, method = "GET", corpo) {
    const token = usuario && jwt.sign({}, process.env.JWT_SECRET, { subject: String(usuario.id), expiresIn: "5m" });
    const resposta = await fetch(base + caminho, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    const dados = await resposta.json().catch(() => null);
    return { status: resposta.status, dados };
  }
  async function usuario(papel, organizacaoId = null) {
    const u = await prisma.usuario.create({ data: { nome: tag, email: `${tag}-${userIds.length}@example.test`, senha: hash, papel, organizacaoId } });
    userIds.push(u.id); return u;
  }
  try {
    for (let i = 0; i < 2; i++) orgIds.push((await prisma.organizacao.create({ data: { nome: `${tag} OSC ${i}` } })).id);
    const [a, b] = orgIds;
    const admin = await usuario("ADMIN"), uoscc = await usuario("RESPONSAVEL_UOSCC"), oscA = await usuario("RESPONSAVEL_OSC", a), oscB = await usuario("RESPONSAVEL_OSC", b);
    await t.test("ADMIN consulta e administra acessos sem escrever dados operacionais", async () => {
      assert.equal((await req(null, "/organizacoes")).status, 401);
      assert.equal((await req(admin, `/organizacoes/${a}`)).status, 200);
      assert.equal((await req(admin, `/organizacoes/${a}`, "PUT", { telefone: "71999999999" })).status, 403);
      assert.equal((await req(admin, `/organizacoes/${a}`, "DELETE")).status, 403);
      assert.equal((await req(admin, "/projetos", "POST", { titulo: "Bloqueado" })).status, 403);
      assert.equal((await req(admin, "/usuarios/solicitacoes")).status, 403);
      const criado = await req(admin, "/usuarios/equipe", "POST", { nome: tag, email: `${tag}-gerente@example.test`, senha, papel: "RESPONSAVEL_UOSCC" });
      assert.equal(criado.status, 201); userIds.push(criado.dados.usuario.id);
      assert.equal("senha" in criado.dados.usuario, false);
      assert.equal((await req(admin, `/usuarios/equipe/${admin.id}`, "PATCH", { papel: "RESPONSAVEL_UOSCC" })).status, 403);
      assert.equal((await req(oscA, "/usuarios/equipe")).status, 403);
      assert.equal((await req(uoscc, "/usuarios/equipe")).status, 403);
      assert.equal((await req(admin, `/usuarios/equipe/${criado.dados.usuario.id}`, "PATCH", { papel: "RESPONSAVEL_OSC", organizacaoId: b })).status, 200);
      assert.equal((await req(admin, "/usuarios/equipe", "POST", { nome: tag, email: `${tag}-sem-vinculo@example.test`, senha, papel: "RESPONSAVEL_OSC" })).status, 400);
    });
    await t.test("OSC não consulta outra ficha nem muda seu vínculo", async () => {
      const lista = await req(oscA, `/organizacoes?ativa=todas&busca=${tag}`);
      assert.deepEqual(lista.dados.organizacoes.map(o => o.id), [a]);
      assert.equal((await req(oscA, `/organizacoes/${b}`)).status, 403);
      assert.equal((await req(oscA, `/organizacoes/${b}`, "PUT", { telefone: "71999999999" })).status, 403);
      assert.equal((await req(oscA, `/organizacoes/${a}`, "PUT", { nome: "Não permitido" })).status, 403);
      assert.equal((await req(oscA, `/organizacoes/${a}`, "PUT", { telefone: "71999999999" })).status, 200);
      assert.equal((await req(oscA, `/organizacoes/${a}`, "DELETE")).status, 403);
      assert.equal((await req(oscA, "/relatorios/organizacoes")).status, 403);
    });
    let geral, especifico;
    await t.test("gerais e específicos: criação, visualização e alteração por perfil", async () => {
      let r = await req(uoscc, "/projetos", "POST", { titulo: tag, tipo: "GERAL", participantesIds: [a, b] });
      assert.equal(r.status, 201, JSON.stringify(r.dados)); geral = r.dados.projeto; projetoIds.push(geral.id);
      assert.equal(geral.participantes.length, 2);
      r = await req(oscA, "/projetos", "POST", { titulo: `${tag} específico`, tipo: "ESPECIFICO" });
      assert.equal(r.status, 201, JSON.stringify(r.dados)); especifico = r.dados.projeto; projetoIds.push(especifico.id);
      assert.equal((await req(oscB, `/projetos/${especifico.id}`)).status, 403);
      assert.equal((await req(oscB, `/projetos/${especifico.id}`, "PUT", { titulo: "Invasão" })).status, 403);
      assert.equal((await req(oscA, `/projetos/${geral.id}`)).status, 200);
      assert.equal((await req(oscA, `/projetos/${geral.id}`, "PUT", { titulo: "Bloqueado" })).status, 403);
      assert.equal((await req(uoscc, `/projetos/${especifico.id}`, "PUT", { titulo: "Bloqueado" })).status, 403);
      assert.equal((await req(admin, `/projetos/${geral.id}`, "PUT", { titulo: "Bloqueado" })).status, 403);
      assert.equal((await req(admin, `/projetos/${geral.id}`, "DELETE")).status, 403);
      assert.equal((await req(uoscc, `/projetos/${especifico.id}`, "DELETE")).status, 403);
      assert.equal((await req(oscA, `/projetos/${especifico.id}`, "PUT", { organizacaoId: b })).status, 403);
      assert.equal((await req(oscA, "/projetos", "POST", { titulo: "Bloqueado", tipo: "GERAL", todasOscs: true })).status, 403);
      assert.equal((await req(uoscc, "/projetos", "POST", { titulo: "Bloqueado", tipo: "ESPECIFICO", organizacaoId: a })).status, 403);
      const lista = await req(oscB, `/projetos?organizacaoId=${a}`);
      assert.equal(lista.dados.projetos.some(p => p.id === especifico.id), false);
      assert.equal((await req(uoscc, `/projetos/${geral.id}`, "PUT", { todasOscs: true, participantesIds: [] })).status, 200);
      const vinculado = await req(oscB, `/projetos?organizacaoId=${b}`);
      assert.equal(vinculado.dados.projetos.some(p => p.id === geral.id), true);
      assert.equal((await req(oscA, `/projetos/${especifico.id}`, "PUT", { titulo: `${tag} alterado` })).status, 200);
    });
    await t.test("pendência e recusa só revelam a situação após conferir a senha", async () => {
      const sol = await prisma.solicitacaoCadastro.create({ data: { tipo: "VINCULO_OSC", nomeUsuario: tag, emailUsuario: `${tag}-pendente@example.test`, senhaUsuario: hash, organizacaoId: a } });
      solIds.push(sol.id);
      const login = () => req(null, "/auth/login", "POST", { email: sol.emailUsuario, senha });
      assert.equal((await login()).dados.status, "PENDENTE");
      assert.equal((await req(null, "/auth/login", "POST", { email: sol.emailUsuario, senha: "errada" })).status, 401);
      const listagem = await req(uoscc, "/usuarios/solicitacoes");
      assert.equal(listagem.dados.solicitacoes.some(s => "senhaUsuario" in s), false);
      assert.equal((await req(uoscc, `/usuarios/solicitacoes/${sol.id}/recusar`, "PATCH", { motivo: "Vínculo não autorizado" })).status, 200);
      assert.equal((await login()).dados.status, "RECUSADA");
      const sol2 = await prisma.solicitacaoCadastro.create({ data: { tipo: "VINCULO_OSC", nomeUsuario: tag, emailUsuario: `${tag}-aprovado@example.test`, senhaUsuario: hash, organizacaoId: a } });
      solIds.push(sol2.id);
      const aprovada = await req(uoscc, `/usuarios/solicitacoes/${sol2.id}/aprovar`, "PATCH");
      assert.equal(aprovada.status, 200, JSON.stringify(aprovada.dados));
      userIds.push(aprovada.dados.resultado.usuario.id);
      assert.equal("senha" in aprovada.dados.resultado.usuario, false);
      assert.equal((await req(null, "/auth/login", "POST", { email: sol2.emailUsuario, senha })).status, 200);
      assert.equal((await req(uoscc, `/usuarios/solicitacoes/${sol2.id}/aprovar`, "PATCH")).status, 400);
    });
    await t.test("cadastro público aguarda aprovação e nova OSC não é duplicada por concorrência", async () => {
      const email = `${tag}-nova-osc@example.test`;
      const enviada = await req(null, "/auth/solicitar-acesso", "POST", { tipo: "NOVA_OSC", nome: tag, email, senha, confirmar_senha: senha, nomeOsc: `${tag} nova OSC`, categoria: "social" });
      assert.equal(enviada.status, 202, JSON.stringify(enviada.dados));
      const sol = await prisma.solicitacaoCadastro.findFirst({ where: { emailUsuario: email } });
      solIds.push(sol.id);
      assert.equal(await prisma.usuario.findUnique({ where: { email } }), null);
      assert.equal((await req(null, "/auth/login", "POST", { email, senha })).dados.status, "PENDENTE");
      const respostas = await Promise.all([req(uoscc, `/usuarios/solicitacoes/${sol.id}/aprovar`, "PATCH"), req(uoscc, `/usuarios/solicitacoes/${sol.id}/aprovar`, "PATCH")]);
      const sucesso = respostas.find(r => r.status === 200);
      assert.ok(sucesso, JSON.stringify(respostas));
      userIds.push(sucesso.dados.resultado.usuario.id);
      orgIds.push(sucesso.dados.resultado.usuario.organizacaoId);
      assert.equal(respostas.filter(r => r.status === 200).length, 1);
      assert.equal(sucesso.dados.resultado.usuario.papel, "RESPONSAVEL_OSC");
      assert.equal(await prisma.organizacao.count({ where: { nome: `${tag} nova OSC` } }), 1);
    });
    await t.test("desativar OSC preserva projetos e bloqueia as sessões existentes", async () => {
      assert.equal((await req(uoscc, `/organizacoes/${a}`, "DELETE")).status, 204);
      assert.equal((await prisma.organizacao.findUnique({ where: { id: a } })).ativa, false);
      assert.ok(await prisma.projeto.findUnique({ where: { id: especifico.id } }));
      assert.equal((await req(oscA, "/auth/me")).status, 403);
      assert.equal((await req(admin, `/organizacoes/${a}`)).status, 200);
      assert.equal((await req(uoscc, `/organizacoes/${a}`, "PUT", { telefone: "71999999999" })).status, 409);
      assert.equal((await req(uoscc, "/relatorios/projetos")).status, 200);
      assert.equal((await req(uoscc, "/demandas")).status, 200);
    });
  } finally {
    // Limpeza restrita aos IDs criados por este teste, sem tocar nos cadastros existentes.
    await prisma.solicitacaoCadastro.deleteMany({ where: { id: { in: solIds } } });
    await prisma.projeto.deleteMany({ where: { id: { in: projetoIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organizacao.deleteMany({ where: { id: { in: orgIds } } });
    await new Promise(resolve => servidor.close(resolve));
    await prisma.$disconnect();
  }
});
