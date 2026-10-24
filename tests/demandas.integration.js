import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../src/config/prisma.js";
process.env.NODE_ENV = "test";
const { app } = await import("../server.js");

test("Demandas: rotas reais, escopo, atendimento, histórico e concorrência", async t => {
  const servidor = app.listen(0, "127.0.0.1");
  await new Promise(resolve => servidor.once("listening", resolve));
  const base = `http://127.0.0.1:${servidor.address().port}/api/demandas`;
  const tag = `demanda-teste-${Date.now()}`;
  const usuarios = [], orgs = [], ids = [];
  async function req(usuario, caminho = "", method = "GET", corpo) {
    const token = usuario && jwt.sign({}, process.env.JWT_SECRET, { subject: String(usuario.id), expiresIn: "5m" });
    const r = await fetch(base + caminho, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    return { status: r.status, dados: await r.json().catch(() => null) };
  }
  async function criar(usuario, corpo = {}) {
    const r = await req(usuario, "", "POST", { titulo: tag, descricao: "Precisamos de materiais para as oficinas.", ...corpo });
    assert.equal(r.status, 201, JSON.stringify(r.dados));
    ids.push(r.dados.demanda.id); return r.dados.demanda;
  }
  let atual;
  try {
    for (let i = 0; i < 2; i++) orgs.push((await prisma.organizacao.create({ data: { nome: `${tag} OSC ${i}` } })).id);
    const hash = await bcrypt.hash("Acesso-Teste2026!", 4);
    for (const [papel, organizacaoId] of [["ADMIN", null], ["RESPONSAVEL_UOSCC", null], ["RESPONSAVEL_OSC", orgs[0]], ["RESPONSAVEL_OSC", orgs[1]]]) {
      usuarios.push(await prisma.usuario.create({ data: { nome: tag, email: `${tag}-${usuarios.length}@example.test`, senha: hash, papel, organizacaoId } }));
    }
    const [admin, uoscc, a, b] = usuarios;
    await t.test("criação: vínculo/status/data automáticos, validação e permissões", async () => {
      assert.equal((await req(null)).status, 401);
      for (const u of [admin, uoscc]) assert.equal((await req(u, "", "POST", { titulo: tag, descricao: "Texto" })).status, 403);
      for (const corpo of [{ titulo: tag }, { titulo: "  ", descricao: "Texto" }, { titulo: tag, descricao: "  " }, { titulo: tag, descricao: "Texto", categoria: "INVALIDA" }, { titulo: tag, descricao: "Texto", organizacaoId: orgs[1] }, { titulo: tag, descricao: "Texto", status: "ATENDIDA" }, { titulo: tag, descricao: "Texto", solicitanteId: admin.id }]) assert.equal((await req(a, "", "POST", corpo)).status, 400);
      atual = await criar(a);
      assert.equal(atual.status, "ABERTA"); assert.equal(atual.organizacaoId, orgs[0]); assert.equal(atual.solicitanteId, a.id); assert.ok(atual.criadoEm);
      assert.equal(atual.categoria, "OUTROS"); assert.equal(atual.historico.length, 1);
      assert.equal(atual.historico[0].statusAnterior, null); assert.equal(atual.historico[0].statusNovo, "ABERTA"); assert.equal(atual.historico[0].usuario.id, a.id);
      await criar(b, { categoria: "MATERIAIS" });
    });
    await t.test("isolamento por OSC, filtros de status/categoria/OSC/data e preservação de legados", async () => {
      assert.equal((await req(b, `/${atual.id}`)).status, 403);
      const filtrada = await req(a, `?busca=${tag}&organizacaoId=${orgs[1]}`);
      assert.deepEqual(filtrada.dados.demandas.map(d => d.id), [atual.id]);
      assert.equal((await req(admin, `/${atual.id}`)).status, 200);
      assert.equal((await req(uoscc, `?busca=${tag}&organizacaoId=${orgs[1]}&categoria=MATERIAIS&status=ABERTA`)).dados.demandas.length, 1);
      const hoje = atual.criadoEm.slice(0, 10);
      assert.equal((await req(uoscc, `?busca=${tag}&de=${hoje}&ate=${hoje}`)).dados.demandas.length, 2);
      assert.equal((await req(a, `?busca=${tag}&ate=1900-01-01`)).dados.demandas.length, 0);
      for (const query of ["de=2026-02-30", "de=2026-02-02&ate=2026-01-01", "status=INVALIDO", "organizacaoId=abc"]) assert.equal((await req(uoscc, `?${query}`)).status, 400);
      const legado = await prisma.demanda.create({ data: { titulo: tag, descricao: "Registro anterior", solicitanteId: a.id, organizacaoId: null, resultado: "Resposta anterior preservada", status: "ATENDIDA" } }); ids.push(legado.id);
      const r = await req(admin, `/${legado.id}`); assert.equal(r.dados.demanda.resultado, "Resposta anterior preservada"); assert.deepEqual(r.dados.demanda.historico, []);
      assert.equal((await req(a, `/${legado.id}`)).status, 403);
      const respostaLegado = await req(uoscc, `/${legado.id}`, "PATCH", { versao: 0, resposta: "Novo acompanhamento sem apagar a resposta anterior" });
      assert.equal(respostaLegado.status, 200);
      assert.equal(respostaLegado.dados.demanda.resultado, "Resposta anterior preservada");
      assert.equal(respostaLegado.dados.demanda.historico[0].resposta, "Novo acompanhamento sem apagar a resposta anterior");
    });
    await t.test("edição da OSC somente aberta; ADMIN leitura e nenhuma exclusão", async () => {
      for (const u of [admin, uoscc, a, b]) assert.equal((await req(u, `/${atual.id}`, "DELETE")).status, 403);
      assert.equal((await req(admin, `/${atual.id}`, "PUT", { versao: atual.versao, titulo: "Bloqueado" })).status, 403);
      assert.equal((await req(admin, `/${atual.id}`, "PATCH", { versao: atual.versao, status: "ATENDIDA", resposta: "Bloqueada" })).status, 403);
      assert.equal((await req(b, `/${atual.id}`, "PUT", { versao: atual.versao, titulo: "Invasão" })).status, 403);
      for (const campo of [{ status: "ATENDIDA" }, { resultado: "Invasão" }, { resposta: "Invasão" }, { organizacaoId: orgs[1] }, { usuarioId: admin.id }]) assert.equal((await req(a, `/${atual.id}`, "PUT", { versao: atual.versao, ...campo })).status, 403);
      const r = await req(a, `/${atual.id}`, "PUT", { versao: atual.versao, titulo: `${tag} atualizado`, descricao: "Descrição mais completa" }); assert.equal(r.status, 200); atual = r.dados.demanda;
      assert.equal(atual.historico.at(-1).tipo, "EDICAO"); assert.equal(atual.historico.at(-1).usuario.id, a.id);
      assert.equal((await req(a, `/${atual.id}`, "PUT", { versao: 0, titulo: "Versão antiga" })).status, 409);
    });
    await t.test("UOSCC responde, observa e altera status com histórico visível à OSC", async () => {
      assert.equal((await req(uoscc, `/${atual.id}`, "PATCH", { versao: atual.versao, titulo: "Alterar solicitação" })).status, 403);
      assert.equal((await req(uoscc, `/${atual.id}`, "PATCH", { versao: atual.versao })).status, 400);
      assert.equal((await req(uoscc, `/${atual.id}`, "PATCH", { versao: atual.versao, status: "ABERTA" })).status, 400);
      for (const status of ["EM_ANALISE", "ATENDIDA", "RECUSADA"]) {
        const anterior = atual.status;
        const r = await req(uoscc, `/${atual.id}`, "PATCH", { versao: atual.versao, status, resposta: `Resposta: ${status}`, observacao: "Acompanhamento com a organização" });
        assert.equal(r.status, 200, JSON.stringify(r.dados)); atual = r.dados.demanda;
        const h = atual.historico.at(-1);
        assert.equal(h.statusAnterior, anterior); assert.equal(h.statusNovo, status); assert.equal(h.usuario.id, uoscc.id); assert.ok(h.criadoEm); assert.equal(h.observacao, "Acompanhamento com a organização");
        assert.equal(!!atual.dataConclusao, status === "ATENDIDA");
        assert.equal((await req(a, `/${atual.id}`, "PUT", { versao: atual.versao, titulo: "Editar em tratamento" })).status, 409);
      }
      const d = (await req(a, `/${atual.id}`)).dados.demanda;
      assert.ok(d.historico.some(h => h.resposta === "Resposta: ATENDIDA"));
      assert.equal((await req(b, `/${atual.id}`)).status, 403);
      assert.equal((await req(a, `?busca=${tag}&status=RECUSADA`)).dados.demandas.length, 1);
      const r = await req(uoscc, `/${atual.id}`, "PATCH", { versao: atual.versao, observacao: "Nova observação sem mudar o status" }); assert.equal(r.status, 200); atual = r.dados.demanda;
      assert.equal(atual.historico.at(-1).statusAnterior, "RECUSADA"); assert.equal(atual.historico.at(-1).statusNovo, "RECUSADA");
    });
    await t.test("concorrência: resposta não é sobrescrita nem separada do histórico", async () => {
      const antes = atual.historico.length, versao = atual.versao;
      const respostas = await Promise.all(["Primeira resposta", "Segunda resposta"].map(resposta => req(uoscc, `/${atual.id}`, "PATCH", { versao, resposta })));
      assert.deepEqual(respostas.map(r => r.status).sort(), [200, 409]);
      const d = (await req(a, `/${atual.id}`)).dados.demanda;
      assert.equal(d.historico.length, antes + 1); assert.equal(d.versao, versao + 1); assert.equal(d.historico.at(-1).resposta, respostas.find(r => r.status === 200).dados.demanda.historico.at(-1).resposta);
      assert.equal(d.resultado, null);
      const aberta = await criar(a);
      const corrida = await Promise.all([req(a, `/${aberta.id}`, "PUT", { versao: aberta.versao, titulo: `${tag} edição simultânea` }), req(uoscc, `/${aberta.id}`, "PATCH", { versao: aberta.versao, status: "EM_ANALISE" })]);
      assert.deepEqual(corrida.map(r => r.status).sort(), [200, 409]);
      const depois = (await req(a, `/${aberta.id}`)).dados.demanda;
      assert.equal(depois.historico.length, 2);
    });
  } finally {
    await prisma.demandaHistorico.deleteMany({ where: { demandaId: { in: ids } } });
    await prisma.demanda.deleteMany({ where: { id: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios.map(u => u.id) } } });
    await prisma.organizacao.deleteMany({ where: { id: { in: orgs } } });
    await new Promise(resolve => servidor.close(resolve)); await prisma.$disconnect();
  }
});
