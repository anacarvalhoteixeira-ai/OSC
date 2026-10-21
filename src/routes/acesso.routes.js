import { Router } from "express";
import { aprovar, desativar, listar } from "../controllers/acesso.controller.js";
import { autenticar, exigirPapel } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(autenticar, exigirPapel("ADMIN", "GESTOR"));
router.get("/", listar); // ex.: /api/usuarios?ativo=false  (solicitações pendentes)
router.patch("/:id/aprovar", aprovar);
router.patch("/:id/desativar", desativar);

export default router;
