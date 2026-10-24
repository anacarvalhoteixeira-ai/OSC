import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { podeGerenciarUsuarios, PAPEIS } from "../utils/permissoes.js";
import { idDaRota, erroPrisma } from "../utils/http.js";

const campos = { id: true, nome: true, email: true, papel: true, ativo: true, organizacaoId: true, organizacao: { select: { nome: true, ativa: true } } };
const propriedades = {
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(191),
  senha: z.string().min(8).refine(v => Buffer.byteLength(v, "utf8") <= 72),
  papel: z.enum(PAPEIS),
  organizacaoId: z.number().int().positive().nullable().optional(),
  ativo: z.boolean(),
};
const criacao = z.object({ ...propriedades, ativo: propriedades.ativo.default(true) }).strict();
const atualizacao = z.object(propriedades).partial().strict();

export function exigirAdmin(req, res, next) {
  if (!podeGerenciarUsuarios(req.usuario)) return res.status(403).json({ erro: "Somente o ADMIN pode gerenciar usuários e permissões." });
  next();
}

export async function listarEquipe(_req, res) {
  res.json({ usuarios: await prisma.usuario.findMany({ select: campos, orderBy: { nome: "asc" } }) });
}

async function conferirVinculo(tx, dados) {
  if (dados.papel !== "RESPONSAVEL_OSC") {
    dados.organizacaoId = null;
    return;
  }
  if (!dados.organizacaoId || !await tx.organizacao.findFirst({ where: { id: dados.organizacaoId, ...(dados.ativo ? { ativa: true } : {}) }, select: { id: true } })) {
    throw new Error("Vincule o responsável a uma OSC ativa.");
  }
}

export async function criarMembro(req, res) {
  const resultado = criacao.safeParse(req.body);
  if (!resultado.success) return res.status(400).json({ erro: "Confira nome, e-mail, perfil e senha (8 caracteres a 72 bytes)." });
  try {
    const dados = resultado.data;
    dados.senha = await bcrypt.hash(dados.senha, 12);
    const usuario = await prisma.$transaction(async tx => {
      await conferirVinculo(tx, dados);
      if (await tx.solicitacaoCadastro.findFirst({ where: { emailUsuario: dados.email, status: "PENDENTE" }, select: { id: true } })) {
        throw new Error("Este e-mail possui uma solicitação pendente. Aguarde a análise pela UOSCC.");
      }
      return tx.usuario.create({ data: dados, select: campos });
    });
    return res.status(201).json({ usuario, mensagem: "Acesso criado com sucesso." });
  } catch (erro) {
    if (!erro.code) return res.status(400).json({ erro: erro.message });
    return erroPrisma(res, erro);
  }
}

export async function atualizarMembro(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "Usuário inválido." });
  const resultado = atualizacao.safeParse(req.body);
  if (!resultado.success || !Object.keys(resultado.data).length) return res.status(400).json({ erro: "Dados de usuário inválidos." });
  const dados = resultado.data;
  if (id === req.usuario.id && ["papel", "ativo", "organizacaoId"].some(c => Object.hasOwn(dados, c))) {
    return res.status(403).json({ erro: "Você não pode alterar o próprio perfil, vínculo ou estado de acesso." });
  }
  if (dados.senha) dados.senha = await bcrypt.hash(dados.senha, 12);
  try {
    const usuario = await prisma.$transaction(async tx => {
      const atual = await tx.usuario.findUnique({ where: { id } });
      if (!atual) return null;
      const final = { ...atual, ...dados };
      await conferirVinculo(tx, final);
      if (atual.papel === "ADMIN" && atual.ativo && (final.papel !== "ADMIN" || !final.ativo)) {
        if (await tx.usuario.count({ where: { papel: "ADMIN", ativo: true } }) <= 1) throw new Error("Mantenha ao menos um ADMIN ativo no sistema.");
      }
      return tx.usuario.update({ where: { id }, data: { ...dados, organizacaoId: final.organizacaoId }, select: campos });
    }, { isolationLevel: "Serializable" });
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado." });
    return res.json({ usuario, mensagem: "Acesso atualizado." });
  } catch (erro) {
    if (erro.code === "P2034") return res.status(409).json({ erro: "Outro acesso foi atualizado ao mesmo tempo. Tente novamente." });
    if (!erro.code) return res.status(400).json({ erro: erro.message });
    return erroPrisma(res, erro);
  }
}
