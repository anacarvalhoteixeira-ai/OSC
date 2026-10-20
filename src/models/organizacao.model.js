import prisma from "../config/prisma.js";

const camposLista = {
  id: true,
  nome: true,
  sigla: true,
  cnpj: true,
  categoria: true,
  bairro: true,
  responsavel: true,
  email: true,
  telefone: true,
  endereco: true,
  descricao: true,
  criadoEm: true,
  atualizadoEm: true,
};

export function listarOrganizacoes({ busca, categoria }) {
  return prisma.organizacao.findMany({
    where: {
      ...(categoria ? { categoria } : {}),
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca } },
              { cnpj: { contains: busca } },
              { responsavel: { contains: busca } },
            ],
          }
        : {}),
    },
    select: camposLista,
    orderBy: { nome: "asc" },
  });
}

export function buscarOrganizacao(id) {
  return prisma.organizacao.findUnique({
    where: { id },
    select: {
      ...camposLista,
      projetos: {
        select: { id: true, titulo: true, status: true },
        orderBy: { titulo: "asc" },
      },
      demandas: {
        select: { id: true, titulo: true, status: true },
        orderBy: { criadoEm: "desc" },
      },
    },
  });
}

export function criarOrganizacao(dados) {
  return prisma.organizacao.create({ data: dados, select: camposLista });
}

export function atualizarOrganizacao(id, dados) {
  return prisma.organizacao.update({
    where: { id },
    data: dados,
    select: camposLista,
  });
}

export function excluirOrganizacao(id) {
  return prisma.organizacao.delete({ where: { id }, select: { id: true } });
}
