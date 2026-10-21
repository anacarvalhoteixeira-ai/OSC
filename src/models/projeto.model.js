import prisma from "../config/prisma.js";

const campos = {
  id: true, titulo: true, descricao: true, status: true,
  dataInicio: true, dataFim: true, organizacaoId: true,
  objetivo: true, resultados: true, orcamento: true, responsavel: true, telefone: true, email: true,
  criadoEm: true, atualizadoEm: true,
  organizacao: { select: { id: true, nome: true } },
};

export function listarProjetos({ busca, status, organizacaoId } = {}) {
  return prisma.projeto.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(organizacaoId ? { organizacaoId } : {}),
      ...(busca ? { OR: [{ titulo: { contains: busca } }, { descricao: { contains: busca } }, { organizacao: { nome: { contains: busca } } }] } : {}),
    },
    select: campos,
    orderBy: { criadoEm: "desc" },
  });
}

export function buscarProjeto(id) {
  return prisma.projeto.findUnique({
    where: { id },
    select: {
      ...campos,
      atendimentos: {
        select: { id: true, quantidade: true, descricao: true, data: true, periodoInicio: true, periodoFim: true },
        orderBy: { data: "desc" },
      },
    },
  });
}

export const criarProjeto = (data) => prisma.projeto.create({ data, select: campos });
export const atualizarProjeto = (id, data) => prisma.projeto.update({ where: { id }, data, select: campos });
export const excluirProjeto = (id) => prisma.projeto.delete({ where: { id }, select: { id: true } });
