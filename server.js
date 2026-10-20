import "dotenv/config";
import cors from "cors";
import express from "express";
import authRoutes from "./src/routes/auth.routes.js";
import organizacaoRoutes from "./src/routes/organizacao.routes.js";

const app = express();
const origem = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: origem }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => res.send("API UOSCC está rodando."));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/organizacoes", organizacaoRoutes);

app.use((_req, res) => res.status(404).json({ erro: "Rota não encontrada." }));
app.use((erro, _req, res, _next) => {
  console.error("Erro inesperado na API:", erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

const porta = Number(process.env.PORT || 3000);
app.listen(porta, () => console.log(`API UOSCC disponível em http://localhost:${porta}.`));
