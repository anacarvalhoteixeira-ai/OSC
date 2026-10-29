import { Router } from "express";
import { atualizar, criar, listar, obter, removerRegistroAtendimento } from "../controllers/demanda.controller.js";
import { autenticar, exigirPapel } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(autenticar);
router.get("/", listar);
router.post("/", exigirPapel("RESPONSAVEL_OSC"), criar);
router.get("/:id", obter);
router.put("/:id", exigirPapel("RESPONSAVEL_OSC", "RESPONSAVEL_UOSCC"), atualizar);
router.patch("/:id", exigirPapel("RESPONSAVEL_OSC", "RESPONSAVEL_UOSCC"), atualizar);
router.delete("/:id/atendimentos/:registroId", exigirPapel("RESPONSAVEL_UOSCC"), removerRegistroAtendimento);
router.delete("/:id", (_req, res) => res.status(403).json({ erro: "Demandas e seu histórico devem ser preservados. A exclusão não é permitida." }));
export default router;
