import { Router } from "express";
import { atualizar, criar, listar, obter, remover } from "../controllers/atendimento.controller.js";
import { autenticar, exigirPapel } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(autenticar);
router.get("/", listar);
router.post("/", exigirPapel("RESPONSAVEL_UOSCC", "RESPONSAVEL_OSC"), criar);
router.get("/:id", obter);
router.put("/:id", exigirPapel("RESPONSAVEL_UOSCC", "RESPONSAVEL_OSC"), atualizar);
router.delete("/:id", exigirPapel("RESPONSAVEL_UOSCC"), remover);

export default router;
