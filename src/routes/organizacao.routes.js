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
const equipe = exigirPapel("RESPONSAVEL_UOSCC");
const admin = exigirPapel("RESPONSAVEL_UOSCC");

router.use(autenticar);
router.get("/", listar);
router.post("/", equipe, criar);
router.get("/:id", obter);
router.put("/:id", exigirPapel("RESPONSAVEL_UOSCC", "RESPONSAVEL_OSC"), atualizar);
router.delete("/:id", admin, remover);

export default router;
