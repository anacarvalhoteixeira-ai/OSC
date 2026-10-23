import prisma from "../config/prisma.js";

const usuarioPublico = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  ativo: true,
  organizacaoId: true,
};

export function buscarOrganizacaoPorNome(nome) {
  return prisma.organizacao.findFirst({
    where: { nome },
    select: { id: true, nome: true },
  });
}

export function buscarUsuarioParaLogin(email) {
  return prisma.usuario.findUnique({ where: { email } });
}

export function buscarUsuarioAtivoPorId(id) {
  return prisma.usuario.findFirst({
    where: { id, ativo: true },
    select: usuarioPublico,
  });
}

export function buscarUsuarioPorEmail(email) {
  return prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  });
}

export function criarSolicitacaoDeAcesso({ nome, email, senha, organizacaoId }) {
  return prisma.usuario.create({
    data: {
      nome,
      email,
      senha,
      papel: "RESPONSAVEL_OSC",
      ativo: false,
      organizacaoId,
    },
    select: usuarioPublico,
  });
}
