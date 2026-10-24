import prisma from "../config/prisma.js";

const camposLista = {
  ativa: true,
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

export function listarOrganizacoes({ busca, categoria, ativa = true, organizacaoId } = {}) {
  return prisma.organizacao.findMany({
    where: {
      ...(ativa != null ? { ativa } : {}),
      ...(organizacaoId ? { id: organizacaoId } : {}),
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
      projetosGerais: { select: { id: true, titulo: true, status: true } },
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
  return prisma.organizacao.update({ where: { id }, data: { ativa: false }, select: { id: true } });
}
