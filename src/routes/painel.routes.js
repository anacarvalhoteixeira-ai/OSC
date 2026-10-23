import { Router } from "express";
import { obter } from "../controllers/painel.controller.js";
import { autenticar, exigirPapel } from "../middlewares/auth.middleware.js";

const router = Router();
router.get("/", autenticar, exigirPapel("ADMIN", "GESTOR", "MEMBRO"), obter);

export default router;
