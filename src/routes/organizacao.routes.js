import { Router } from "express";
import {
  atualizar,
  criar,
  listar,
  obter,
  remover,
} from "../controllers/organizacao.controller.js";
import { autenticar, exigirPapel } from "../middlewares/auth.middleware.js";

const router = Router();
const equipe = exigirPapel("ADMIN", "GESTOR", "MEMBRO");
const admin = exigirPapel("ADMIN");

router.use(autenticar);
router.get("/", equipe, listar);
router.post("/", equipe, criar);
router.get("/:id", obter);
router.put("/:id", atualizar);
router.delete("/:id", admin, remover);

export default router;
