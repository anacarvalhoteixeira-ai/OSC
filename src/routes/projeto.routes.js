import { Router } from "express";
import { atualizar, criar, listar, obter, remover } from "../controllers/projeto.controller.js";
import { autenticar, exigirPapel } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(autenticar);
router.get("/", listar);
router.post("/", criar);
router.get("/:id", obter);
router.put("/:id", atualizar);
router.delete("/:id", exigirPapel("ADMIN", "GESTOR"), remover);

export default router;
