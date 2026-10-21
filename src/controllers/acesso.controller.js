import { z } from "zod";
import { definirAtivo, listarUsuarios } from "../models/acesso.model.js";
import { erroPrisma, idDaRota, limparQuery, validar } from "../utils/http.js";

const schemaFiltros = z.object({
  ativo: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export async function listar(req, res) {
  const filtros = validar(schemaFiltros, limparQuery(req.query), res);
  if (!filtros) return;
  try {
    return res.json({ usuarios: await listarUsuarios(filtros) });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}

function alterar(ativo) {
  return async (req, res) => {
    const id = idDaRota(req.params.id);
    if (!id) return res.status(400).json({ erro: "ID de usuário inválido." });
    if (!ativo && id === req.usuario.id) {
      return res.status(400).json({ erro: "Você não pode desativar a própria conta." });
    }
    try {
      return res.json({ usuario: await definirAtivo(id, ativo) });
    } catch (erro) {
      return erroPrisma(res, erro);
    }
  };
}

export const aprovar = alterar(true);
export const desativar = alterar(false);
