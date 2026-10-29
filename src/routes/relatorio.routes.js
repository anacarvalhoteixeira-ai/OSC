import { Router } from "express";
import { gerar } from "../controllers/relatorio.controller.js";
import { autenticar, exigirPapel } from "../middlewares/auth.middleware.js";

const router = Router();
router.get("/:tipo", autenticar, exigirPapel("RESPONSAVEL_UOSCC"), gerar);

export default router;
