import prisma from "../config/prisma.js";

export async function montarPainel() {
  const [organizacoes, projetos, atendidos, recentes] = await Promise.all([
    prisma.organizacao.count({ where: { ativa: true } }),
    prisma.projeto.count(),
    prisma.registroAtendimento.aggregate({ _sum: { quantidade: true } }),
    prisma.projeto.findMany({ take: 5, orderBy: { atualizadoEm: "desc" }, select: { id: true, titulo: true, status: true, tipo: true, atualizadoEm: true } }),
  ]);
  return { totais: { organizacoes, projetos, pessoasAtendidas: atendidos._sum.quantidade ?? 0 }, projetosRecentes: recentes };
}
