import { Router } from "express";
import { aprovar, listar, recusar } from "../controllers/acesso.controller.js";
import { autenticar, exigirPapel } from "../middlewares/auth.middleware.js";

import { exigirAdmin, listarEquipe, criarMembro, atualizarMembro } from "../controllers/equipe.controller.js";

const router = Router();
router.get("/equipe", autenticar, exigirAdmin, listarEquipe);
router.post("/equipe", autenticar, exigirAdmin, criarMembro);
router.patch("/equipe/:id", autenticar, exigirAdmin, atualizarMembro);
router.use(autenticar, exigirPapel("RESPONSAVEL_UOSCC"));

router.get("/solicitacoes", listar);
router.patch("/solicitacoes/:id/aprovar", aprovar);
router.patch("/solicitacoes/:id/recusar", recusar);

export default router;