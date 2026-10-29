import { z } from "zod";

export function escopoPessoas(usuario) {
  if (usuario?.papel === "RESPONSAVEL_UOSCC") return {};
  if (usuario?.papel === "RESPONSAVEL_OSC" && usuario.organizacaoId) return { organizacaoId: usuario.organizacaoId };
  return null;
}

export const schemaPessoa = z.object({
  nome: z.string().trim().min(2).max(120),
  tipo: z.enum(["ALUNO", "BENEFICIARIO"]),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
    const data = new Date(`${v}T00:00:00Z`);
    return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === v
      && v >= "1900-01-01" && v <= new Date().toISOString().slice(0, 10);
  }, "Informe uma data de nascimento válida, sem data futura.").nullable().optional(),
  telefone: z.string().trim().max(20).nullable().optional(),
  responsavel: z.string().trim().max(120).nullable().optional(),
  ativo: z.boolean().optional(),
}).strict();

export const schemaFiltroPessoas = z.object({
  busca: z.string().trim().max(120).optional(),
  organizacaoId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(["ALUNO", "BENEFICIARIO"]).optional(),
  ativo: z.enum(["true", "false", "todos"]).optional(),
  pagina: z.coerce.number().int().min(1).max(100000).default(1),
});
