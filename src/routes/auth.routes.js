import { Router } from "express";
import { entrar, pesquisarOsc, solicitarAcesso } from "../controllers/auth.controller.js";
import { autenticar } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/pesquisa-osc", pesquisarOsc);
router.post("/solicitar-acesso", solicitarAcesso);
router.post("/login", entrar);
router.get("/me", autenticar, (req, res) => res.json({ usuario: req.usuario }));

export default router;
