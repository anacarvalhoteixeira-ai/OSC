import prisma from "../config/prisma.js";

const campos = {
  id: true, quantidade: true, descricao: true, data: true,
  periodoInicio: true, periodoFim: true, organizacaoId: true, projetoId: true, criadoEm: true,
  organizacao: { select: { id: true, nome: true } },
  projeto: { select: { id: true, titulo: true } },
};

export function listarAtendimentos({ organizacaoId, projetoId, de, ate } = {}) {
  const data = {
    ...(de ? { gte: de } : {}),
    ...(ate ? { lt: new Date(ate.getTime() + 24 * 60 * 60 * 1000) } : {}), // inclui o dia final
  };
  return prisma.registroAtendimento.findMany({
    where: {
      ...(organizacaoId ? { organizacaoId } : {}),
      ...(projetoId ? { projetoId } : {}),
      ...(Object.keys(data).length ? { data } : {}),
    },
    select: campos,
    orderBy: { data: "desc" },
  });
}

export const buscarAtendimento = (id) => prisma.registroAtendimento.findUnique({ where: { id }, select: campos });
export const buscarProjetoDaOsc = (id) =>
  prisma.projeto.findUnique({ where: { id }, select: { id: true, organizacaoId: true } });
export const criarAtendimento = (data) => prisma.registroAtendimento.create({ data, select: campos });
export const atualizarAtendimento = (id, data) =>
  prisma.registroAtendimento.update({ where: { id }, data, select: campos });
export const excluirAtendimento = (id) =>
  prisma.registroAtendimento.delete({ where: { id }, select: { id: true } });
