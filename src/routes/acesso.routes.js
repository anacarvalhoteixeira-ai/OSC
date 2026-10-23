import { Router } from "express";
import { aprovar, listar, recusar } from "../controllers/acesso.controller.js";
import { autenticar, exigirPapel } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(autenticar, exigirPapel("ADMIN", "GESTOR"));

router.get("/solicitacoes", listar);
router.patch("/solicitacoes/:id/aprovar", aprovar);
router.patch("/solicitacoes/:id/recusar", recusar);

export default router;