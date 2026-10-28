import "dotenv/config";
import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import prisma from "./src/config/prisma.js";
import { validarAmbiente } from "./src/config/ambiente.js";
import authRoutes from "./src/routes/auth.routes.js";
import organizacaoRoutes from "./src/routes/organizacao.routes.js";
import demandaRoutes from "./src/routes/demanda.routes.js";
import projetoRoutes from "./src/routes/projeto.routes.js";
import atendimentoRoutes from "./src/routes/atendimento.routes.js";
import painelRoutes from "./src/routes/painel.routes.js";
import relatorioRoutes from "./src/routes/relatorio.routes.js";
import acessoRoutes from "./src/routes/acesso.routes.js";

export const app = express();
validarAmbiente();
const dist = fileURLToPath(new URL("./dist/", import.meta.url));
if (process.env.NODE_ENV === "production" && !existsSync(`${dist}/login.html`)) {
  throw new Error("Frontend não compilado. Execute npm run build antes de iniciar.");
}
app.disable("x-powered-by");
// Use IPs/CIDRs dos proxies confiáveis; nunca confiar em todos os remetentes.
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY.split(",").map(v => v.trim()));
const origem = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  });
  if (process.env.NODE_ENV === "production") res.set("Strict-Transport-Security", "max-age=31536000");
  next();
});
app.use(cors({ origin: origem }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

app.get("/", (_req, res) => res.redirect("/login.html"));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "indisponivel" });
  }
});
app.use("/api/auth", authRoutes);
app.use("/api/organizacoes", organizacaoRoutes);
app.use("/api/projetos", projetoRoutes);
app.use("/api/demandas", demandaRoutes);
app.use("/api/atendimentos", atendimentoRoutes);
app.use("/api/painel", painelRoutes);
app.use("/api/relatorios", relatorioRoutes);
app.use("/api/usuarios", acessoRoutes);
app.use("/api", (_req, res) => res.status(404).json({ erro: "Rota não encontrada." }));
app.use(express.static(dist, {
  dotfiles: "deny",
  setHeaders(res, caminho) {
    res.set("Cache-Control", /[/\\]assets[/\\]/.test(caminho)
      ? "public, max-age=31536000, immutable" : "no-cache");
  },
}));

app.use((_req, res) => res.status(404).json({ erro: "Rota não encontrada." }));
app.use((erro, _req, res, _next) => {
  if (erro.type === "entity.too.large") return res.status(413).json({ erro: "Corpo da requisição muito grande." });
  if (erro.type === "entity.parse.failed") return res.status(400).json({ erro: "JSON inválido." });
  console.error("Erro inesperado na API:", erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

const porta = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV !== "test") {
  const servidor = app.listen(porta, "0.0.0.0", () => console.log(`UOSCC disponível na porta ${porta}.`));
  for (const sinal of ["SIGTERM", "SIGINT"]) process.once(sinal, () => {
    const prazo = setTimeout(() => process.exit(1), 10000);
    prazo.unref();
    servidor.close(async () => {
      await prisma.$disconnect();
      clearTimeout(prazo);
      process.exit(0);
    });
  });
}
