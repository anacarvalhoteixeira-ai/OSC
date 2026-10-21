import prisma from "../config/prisma.js";

const campos = {
  id: true, nome: true, email: true, papel: true, ativo: true, organizacaoId: true, criadoEm: true,
  organizacao: { select: { id: true, nome: true } },
};

export function listarUsuarios({ ativo } = {}) {
  return prisma.usuario.findMany({
    where: ativo === undefined ? {} : { ativo },
    select: campos,
    orderBy: { criadoEm: "desc" },
  });
}

export const definirAtivo = (id, ativo) =>
  prisma.usuario.update({ where: { id }, data: { ativo }, select: campos });
