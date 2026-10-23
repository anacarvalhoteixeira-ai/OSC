import { z } from "zod";

export const dataOpcional = z
  .preprocess((v) => (v === "" || v == null ? null : v), z.coerce.date().nullable())
  .optional();

export function idDaRota(valor) {
  if (!/^\d+$/.test(valor)) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function validar(schema, dados, res) {
  const resultado = schema.safeParse(dados);
  if (!resultado.success) {
    res.status(400).json({ erro: "Dados inválidos.", detalhes: resultado.error.issues });
    return null;
  }
  return resultado.data;
}

// Remove parâmetros vazios da query string (ex.: ?status=&busca=)
export function limparQuery(query) {
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => typeof v === "string" && v.trim() !== ""),
  );
}

export const ehOsc = (req) => req.usuario.papel === "RESPONSAVEL_OSC";

export function erroPrisma(res, erro) {
  if (erro?.code === "P2025") return res.status(404).json({ erro: "Registro não encontrado." });
  if (erro?.code === "P2003") {
    return res.status(409).json({ erro: "Referência inválida ou registro com vínculos que impedem a operação." });
  }
  if (erro?.code === "P2002") return res.status(409).json({ erro: "Já existe um registro com esses dados." });
  console.error("Falha de banco:", erro);
  return res.status(500).json({ erro: "Não foi possível concluir a operação." });
}
