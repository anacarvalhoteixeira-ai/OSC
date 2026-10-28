import test from "node:test";
import assert from "node:assert/strict";
import { validarAmbiente } from "../src/config/ambiente.js";
import { limitarRequisicoes } from "../src/middlewares/limite.middleware.js";

test("produção recusa segredo fraco, banco inválido e origem insegura", () => {
  const env = { NODE_ENV: "production", JWT_SECRET: "a".repeat(48), DATABASE_URL: "mysql://app:senha@db:3306/osc" };
  assert.doesNotThrow(() => validarAmbiente(env));
  assert.throws(() => validarAmbiente({ ...env, JWT_SECRET: "curta" }), /JWT_SECRET/);
  assert.throws(() => validarAmbiente({ ...env, DATABASE_URL: "postgresql://db/osc" }), /MySQL/);
  assert.throws(() => validarAmbiente({ ...env, FRONTEND_ORIGIN: "http://exemplo.com" }), /HTTPS/);
  assert.doesNotThrow(() => validarAmbiente({ ...env, FRONTEND_ORIGIN: "https://exemplo.com" }));
});

test("limite isola IPs, ignora cabeçalho forjado e libera após a janela", () => {
  let tempo = 1000;
  const limite = limitarRequisicoes({ maximo: 2, janelaMs: 1000, agora: () => tempo });
  const chamar = (ip, header = "") => {
    const resultado = { status: 200, headers: {}, passou: false };
    const res = {
      set(k, v) { resultado.headers[k] = v; return this; },
      status(s) { resultado.status = s; return this; },
      json(v) { resultado.corpo = v; return this; },
    };
    limite({ ip, headers: { "x-forwarded-for": header } }, res, () => { resultado.passou = true; });
    return resultado;
  };
  assert.equal(chamar("a").passou, true);
  assert.equal(chamar("a").passou, true);
  assert.equal(chamar("a", "ip-forjado").status, 429);
  assert.equal(chamar("a").headers["Retry-After"], "1");
  assert.equal(chamar("b").passou, true);
  tempo = 2001;
  assert.equal(chamar("a").passou, true);
});
