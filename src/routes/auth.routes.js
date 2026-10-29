import { Router } from "express";
import { entrar, pesquisarOsc, solicitarAcesso } from "../controllers/auth.controller.js";
import { autenticar } from "../middlewares/auth.middleware.js";
import { limitarRequisicoes } from "../middlewares/limite.middleware.js";

const router = Router();

router.get("/pesquisa-osc", limitarRequisicoes({ maximo: 120, janelaMs: 60000 }), pesquisarOsc);
router.post("/solicitar-acesso", limitarRequisicoes({ maximo: 10 }), solicitarAcesso);
router.post("/login", limitarRequisicoes({ maximo: 30 }), entrar);
router.get("/me", autenticar, (req, res) => res.json({ usuario: req.usuario }));

export default router;
