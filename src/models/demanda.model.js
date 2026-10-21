import prisma from "../config/prisma.js";

const campos = {
  id: true, titulo: true, descricao: true, status: true, categoria: true,
  organizacaoId: true, solicitanteId: true, responsavelId: true,
  prazo: true, dataConclusao: true, resultado: true,
  criadoEm: true, atualizadoEm: true,
  organizacao: { select: { id: true, nome: true } },
  solicitante: { select: { id: true, nome: true } },
  responsavel: { select: { id: true, nome: true } },
};

export function listarDemandas({ busca, status, categoria, organizacaoId } = {}) {
  return prisma.demanda.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(categoria ? { categoria } : {}),
      ...(organizacaoId ? { organizacaoId } : {}),
      ...(busca ? { OR: [{ titulo: { contains: busca } }, { descricao: { contains: busca } }, { organizacao: { nome: { contains: busca } } }] } : {}),
    },
    select: campos,
    orderBy: { criadoEm: "desc" },
  });
}

export const buscarDemanda = (id) => prisma.demanda.findUnique({ where: { id }, select: campos });
export const criarDemanda = (data) => prisma.demanda.create({ data, select: campos });
export const atualizarDemanda = (id, data) => prisma.demanda.update({ where: { id }, data, select: campos });
export const excluirDemanda = (id) => prisma.demanda.delete({ where: { id }, select: { id: true } });
