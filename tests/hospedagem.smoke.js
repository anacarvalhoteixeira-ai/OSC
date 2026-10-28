// Não acessa o banco. Requer build e permissão para abrir porta local.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ||= "mysql://teste:teste@127.0.0.1:3306/teste";
const { app } = await import("../server.js");
const servidor = app.listen(0, "127.0.0.1");
await new Promise((resolve, reject) => { servidor.once("listening", resolve); servidor.once("error", reject); });
const base = `http://127.0.0.1:${servidor.address().port}`;
try {
  const raiz = await fetch(base, { redirect: "manual" });
  assert.equal(raiz.status, 302);
  assert.equal(raiz.headers.get("location"), "/login.html");
  for (const caminho of ["/login.html", "/cadastro.html", "/inicio/index.html", "/inicio/telas/oscs/index.html"]) {
    const resposta = await fetch(base + caminho);
    assert.equal(resposta.status, 200, caminho);
    assert.match(resposta.headers.get("content-type"), /text\/html/);
    assert.equal(resposta.headers.get("x-frame-options"), "DENY");
  }
  const html = await readFile(new URL("../dist/login.html", import.meta.url), "utf8");
  const asset = html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
  const js = await fetch(base + asset);
  assert.equal(js.status, 200);
  assert.match(js.headers.get("cache-control"), /immutable/);
  const health = await fetch(base + "/api/health");
  assert.deepEqual(await health.json(), { status: "ok" });
  assert.equal(health.headers.get("cache-control"), "no-store");
  for (const caminho of ["/.env", "/server.js", "/api/inexistente"]) assert.equal((await fetch(base + caminho)).status, 404);
  const invalido = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(invalido.status, 400);
  for (let i = 0; i < 30; i++) {
    assert.equal((await fetch(base + "/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    })).status, 400);
  }
  const bloqueio = await fetch(base + "/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.10" }, body: "{}",
  });
  assert.equal(bloqueio.status, 429);
  assert.ok(Number(bloqueio.headers.get("retry-after")) > 0);
  console.log("Smoke de hospedagem: páginas, assets, API, cabeçalhos e arquivos privados OK.");
} finally {
  await new Promise(resolve => servidor.close(resolve));
  await (await import("../src/config/prisma.js")).default.$disconnect();
}
