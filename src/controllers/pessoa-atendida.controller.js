import prisma from "../config/prisma.js";
import { erroPrisma, idDaRota, limparQuery, validar } from "../utils/http.js";
import { escopoPessoas, schemaPessoa, schemaFiltroPessoas } from "../utils/pessoa-atendida.js";

const incluir = { organizacao: { select: { id: true, nome: true, ativa: true } } };
const dadosBanco = dados => ({ ...dados, ...(dados.dataNascimento !== undefined
  ? { dataNascimento: dados.dataNascimento ? new Date(`${dados.dataNascimento}T00:00:00Z`) : null } : {}) });

export async function listar(req, res) {
  const filtros = validar(schemaFiltroPessoas, limparQuery(req.query), res);
  if (!filtros) return;
  const escopo = escopoPessoas(req.usuario);
  if (!escopo) return res.status(403).json({ erro: "Perfil sem acesso às pessoas atendidas." });
  const where = {
    ...(filtros.organizacaoId ? { organizacaoId: filtros.organizacaoId } : {}),
    ...escopo,
    ...(filtros.busca ? { nome: { contains: filtros.busca } } : {}),
    ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    ...(filtros.ativo !== "todos" ? { ativo: filtros.ativo !== "false" } : {}),
  };
  try {
    const [pessoas, total] = await prisma.$transaction([
      prisma.pessoaAtendida.findMany({ where, include: incluir, orderBy: [{ nome: "asc" }, { id: "asc" }], take: 30, skip: (filtros.pagina - 1) * 30 }),
      prisma.pessoaAtendida.count({ where }),
    ]);
    return res.json({ pessoas, total, pagina: filtros.pagina, paginas: Math.ceil(total / 30) });
  } catch (erro) { return erroPrisma(res, erro); }
}

export async function obter(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });
  const escopo = escopoPessoas(req.usuario);
  if (!escopo) return res.status(403).json({ erro: "Perfil sem acesso às pessoas atendidas." });
  try {
    const pessoa = await prisma.pessoaAtendida.findFirst({ where: { id, ...escopo }, include: incluir });
    if (!pessoa) return res.status(404).json({ erro: "Pessoa não encontrada." });
    return res.json({ pessoa });
  } catch (erro) { return erroPrisma(res, erro); }
}

export async function criar(req, res) {
  const dados = validar(schemaPessoa, req.body, res);
  if (!dados) return;
  try {
    const pessoa = await prisma.pessoaAtendida.create({
      data: { ...dadosBanco(dados), organizacaoId: req.usuario.organizacaoId }, include: incluir,
    });
    return res.status(201).json({ pessoa });
  } catch (erro) { return erroPrisma(res, erro); }
}

export async function atualizar(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });
  const dados = validar(schemaPessoa.partial().refine(v => Object.keys(v).length > 0), req.body, res);
  if (!dados) return;
  try {
    // O vínculo integra o próprio UPDATE: IDs de outras OSCs não podem ser alterados.
    const pessoa = await prisma.pessoaAtendida.update({
      where: { id, organizacaoId: req.usuario.organizacaoId }, data: dadosBanco(dados), include: incluir,
    });
    return res.json({ pessoa });
  } catch (erro) { return erroPrisma(res, erro); }
}
