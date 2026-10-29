import jwt from "jsonwebtoken";
import { PAPEIS } from "../utils/permissoes.js";
import { buscarUsuarioAtivoPorId } from "../models/usuario.model.js";

export async function autenticar(req, res, next) {
  const cabecalho = req.get("authorization") || "";
  const [tipo, token] = cabecalho.split(" ");
  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ erro: "Autenticação necessária." });
  }

  const segredo = process.env.JWT_SECRET;
  if (!segredo) {
    console.error("JWT_SECRET não foi definida no ambiente.");
    return res.status(500).json({ erro: "Autenticação indisponível." });
  }

  let payload;
  try {
    payload = jwt.verify(token, segredo);
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }

  const id = Number(payload.sub);
  if (!Number.isSafeInteger(id)) {
    return res.status(401).json({ erro: "Token inválido." });
  }

  const usuario = await buscarUsuarioAtivoPorId(id);
  if (!usuario) {
    return res.status(401).json({ erro: "Conta inativa ou inexistente." });
  }

  if (!PAPEIS.includes(usuario.papel)) return res.status(403).json({ erro: "Perfil não autorizado." });
  if (usuario.papel === "RESPONSAVEL_OSC" && (!usuario.organizacaoId || !usuario.organizacao?.ativa)) {
    return res.status(403).json({ erro: "Sua OSC está inativa ou seu vínculo não está autorizado. Procure a UOSCC." });
  }
  req.usuario = usuario;
  return next();
}

export function exigirPapel(...papeis) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ erro: "Autenticação necessária." });
    if (!papeis.includes(req.usuario.papel)) {
      return res.status(403).json({ erro: "Você não tem permissão para esta ação." });
    }
    return next();
  };
}
