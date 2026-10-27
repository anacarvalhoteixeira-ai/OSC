import { z } from "zod";
import {
  atualizarOrganizacao,
  buscarOrganizacao,
  criarOrganizacao,
  excluirOrganizacao,
  listarOrganizacoes,
} from "../models/organizacao.model.js";

const categorias = ["educacao", "meio-ambiente", "saude", "social", "direitos", "cultura"];
const cnpj = z.string().trim()
  .transform((valor) => valor.replace(/\D/g, ""))
  .refine((valor) => /^\d{14}$/.test(valor), "Informe um CNPJ com 14 dígitos.")
  .transform((valor) => valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"));
const emailOpcional = z.preprocess(
  (valor) => valor === "" ? null : valor,
  z.string().email().max(191).nullable(),
).optional();

const camposOrganizacao = {
  ativa: z.boolean().optional(),
  nome: z.string().trim().min(2).max(180),
  cnpj,
  categoria: z.enum(categorias),
  endereco: z.string().trim().min(3).max(255),
  bairro: z.string().trim().max(120).optional(),
  responsavel: z.string().trim().min(2).max(120),
  telefone: z.string().trim().min(8).max(20),
  email: emailOpcional,
  descricao: z.string().trim().max(5000).optional(),
};
const schemaCriacao = z.object(camposOrganizacao).strict();
const schemaAtualizacao = z.object(camposOrganizacao).partial().strict();
const camposEditaveisPelaOsc = new Set([
  "categoria", "bairro", "responsavel", "telefone", "email", "endereco", "descricao",
]);

function idDaRota(valor) {
  if (!/^\d+$/.test(valor)) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function falha(res, erro) {
  if (erro?.code === "P2002") {
    return res.status(409).json({ erro: "Já existe uma OSC cadastrada com esse CNPJ." });
  }
  if (erro?.code === "P2025") return res.status(404).json({ erro: "OSC não encontrada." });
  if (erro?.code === "P2003") {
    return res.status(409).json({ erro: "A OSC possui registros vinculados e não pode ser excluída." });
  }
  console.error("Falha ao acessar OSC:", erro);
  return res.status(500).json({ erro: "Não foi possível concluir a operação." });
}

export async function listar(req, res) {
  const busca = typeof req.query.busca === "string" ? req.query.busca.trim().slice(0, 180) : "";
  const categoria = typeof req.query.categoria === "string" ? req.query.categoria : "";
  if (categoria && !categorias.includes(categoria)) {
    return res.status(400).json({ erro: "Categoria inválida." });
  }
  try {
    if (req.query.ativa && !["true", "false", "todas"].includes(req.query.ativa)) return res.status(400).json({ erro: "Situação inválida." });
    const organizacoes = await listarOrganizacoes({ busca, categoria, ativa: req.usuario.papel === "RESPONSAVEL_OSC" ? true : (req.query.ativa === "todas" ? null : req.query.ativa !== "false"), organizacaoId: req.usuario.papel === "RESPONSAVEL_OSC" ? req.usuario.organizacaoId : undefined });
    return res.json({ organizacoes });
  } catch (erro) {
    return falha(res, erro);
  }
}

export async function obter(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de OSC inválido." });
  if (req.usuario.papel === "RESPONSAVEL_OSC" && req.usuario.organizacaoId !== id) {
    return res.status(403).json({ erro: "Você só pode consultar os dados da sua própria OSC." });
  }
  try {
    const organizacao = await buscarOrganizacao(id);
    if (!organizacao) return res.status(404).json({ erro: "OSC não encontrada." });
    return res.json({ organizacao });
  } catch (erro) {
    return falha(res, erro);
  }
}

export async function criar(req, res) {
  const validacao = schemaCriacao.safeParse(req.body);
  if (!validacao.success) {
    return res.status(400).json({ erro: "Dados inválidos.", detalhes: validacao.error.issues });
  }
  try {
    const organizacao = await criarOrganizacao(validacao.data);
    return res.status(201).json({ organizacao });
  } catch (erro) {
    return falha(res, erro);
  }
}

export async function atualizar(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de OSC inválido." });
  const validacao = schemaAtualizacao.safeParse(req.body);
  if (!validacao.success) {
    return res.status(400).json({ erro: "Dados inválidos.", detalhes: validacao.error.issues });
  }
  const dados = validacao.data;
  if (Object.keys(dados).length === 0) {
    return res.status(400).json({ erro: "Envie ao menos um campo para atualizar." });
  }

  if (req.usuario.papel === "RESPONSAVEL_OSC") {
    if (req.usuario.organizacaoId !== id) {
      return res.status(403).json({ erro: "Você só pode editar os dados da sua própria OSC." });
    }
    const camposBloqueados = Object.keys(dados).filter((campo) => !camposEditaveisPelaOsc.has(campo));
    if (camposBloqueados.length) {
      return res.status(403).json({ erro: "Nome, CNPJ e situação devem ser alterados pela equipe UOSCC." });
    }
  }

  try {
    const atual = await buscarOrganizacao(id);
    if (!atual) return res.status(404).json({ erro: "OSC não encontrada." });
    if (!atual.ativa && !(req.usuario.papel === "RESPONSAVEL_UOSCC" && dados.ativa === true)) return res.status(409).json({ erro: "Reative a OSC para alterar seus dados. Seu histórico permanece disponível para consulta." });
    const organizacao = await atualizarOrganizacao(id, dados);
    return res.json({ organizacao });
  } catch (erro) {
    return falha(res, erro);
  }
}

export async function remover(req, res) {
  const id = idDaRota(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de OSC inválido." });
  try {
    await excluirOrganizacao(id);
    return res.status(204).end();
  } catch (erro) {
    return falha(res, erro);
  }
}
