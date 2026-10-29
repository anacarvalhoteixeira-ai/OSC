import prisma from "../config/prisma.js";

const campos = {
  id: true, titulo: true, descricao: true, status: true, categoria: true, versao: true,
  organizacaoId: true, solicitanteId: true, responsavelId: true,
  prazo: true, dataConclusao: true, resultado: true,
  criadoEm: true, atualizadoEm: true,
  organizacao: { select: { id: true, nome: true } },
  solicitante: { select: { id: true, nome: true } },
  responsavel: { select: { id: true, nome: true } },
};
const detalhes = {
  ...campos,
  historico: {
    select: { id: true, tipo: true, statusAnterior: true, statusNovo: true, resposta: true, observacao: true, criadoEm: true, usuario: { select: { id: true, nome: true } } },
    orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
  },
};

export function listarDemandas({ busca, status, categoria, organizacaoId, de, ate } = {}) {
  return prisma.demanda.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(categoria ? { categoria } : {}),
      ...(organizacaoId ? { organizacaoId } : {}),
      ...((de || ate) ? { criadoEm: { ...(de ? { gte: new Date(`${de}T00:00:00.000Z`) } : {}), ...(ate ? { lt: new Date(new Date(`${ate}T00:00:00.000Z`).getTime() + 86400000) } : {}) } } : {}),
      ...(busca ? { OR: [{ titulo: { contains: busca } }, { descricao: { contains: busca } }, { organizacao: { nome: { contains: busca } } }] } : {}),
    },
    select: campos,
    orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
  });
}

export const buscarDemanda = (id) => prisma.demanda.findUnique({ where: { id }, select: detalhes });

export function excluirRegistroAtendimento(atual, registroId, usuarioId) {
  return prisma.$transaction(async tx => {
    const alterada = await tx.demanda.updateMany({
      where: { id: atual.id, versao: atual.versao },
      data: { versao: { increment: 1 } },
    });
    if (alterada.count !== 1) return null;
    const removido = await tx.demandaHistorico.deleteMany({
      where: { id: registroId, demandaId: atual.id, usuarioId, tipo: "ATENDIMENTO" },
    });
    if (removido.count !== 1) throw new Error("O registro não está mais disponível para exclusão.");
    return tx.demanda.findUnique({ where: { id: atual.id }, select: detalhes });
  });
}
export const criarDemanda = (data, usuarioId) => prisma.demanda.create({
  data: { ...data, status: "ABERTA", historico: { create: { usuarioId, tipo: "CRIACAO", statusNovo: "ABERTA" } } },
  select: detalhes,
});

// A comparação de versão ocorre no mesmo comando que grava os dados. O histórico
// pertence à mesma transação: uma atualização concorrente não pode ser sobrescrita.
export function atualizarDemanda(atual, data, usuarioId, registro, somenteAberta = false) {
  return prisma.$transaction(async tx => {
    const resultado = await tx.demanda.updateMany({
      where: { id: atual.id, versao: atual.versao, ...(somenteAberta ? { status: "ABERTA", organizacaoId: atual.organizacaoId } : {}) },
      data: { ...data, versao: { increment: 1 } },
    });
    if (resultado.count !== 1) return null;
    await tx.demandaHistorico.create({ data: { demandaId: atual.id, usuarioId, statusAnterior: atual.status, statusNovo: data.status ?? atual.status, ...registro } });
    return tx.demanda.findUnique({ where: { id: atual.id }, select: detalhes });
  });
}
