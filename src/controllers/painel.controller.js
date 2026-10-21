import { montarPainel } from "../models/painel.model.js";
import { erroPrisma } from "../utils/http.js";

export async function obter(_req, res) {
  try {
    return res.json({ painel: await montarPainel() });
  } catch (erro) {
    return erroPrisma(res, erro);
  }
}
