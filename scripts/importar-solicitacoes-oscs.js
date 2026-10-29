import fs from "node:fs/promises";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../src/config/prisma.js";

// O arquivo de entrada contém dados pessoais: mantenha-o fora de public e dist.
const arquivo = process.argv[2];
if (!arquivo) throw new Error("Informe o caminho do JSON de solicitações.");
const usarProvisorios = process.argv.includes("--emails-provisorios");
const aplicar = process.argv.includes("--aplicar");
const normalizar = s => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const schema = z.object({
  origemId: z.number().int().positive(),
  nomeOsc: z.string().min(2).max(180),
  nomeUsuario: z.string().min(2).max(120),
  emailUsuario: z.email().max(191).nullable(),
  telefoneUsuario: z.string().max(20).nullable(),
  telefoneOsc: z.string().max(20).nullable(),
  emailOsc: z.email().max(191).nullable(),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/).nullable(),
  endereco: z.string().max(255).nullable(),
  categoria: z.enum(["social", "educacao", "cultura", "direitos", "saude", "meio-ambiente"]),
});
try {
  const linhas = JSON.parse(await fs.readFile(arquivo, "utf8"));
  // A coluna do PDF pode conter dois telefones; usa o primeiro como contato.
  for (const linha of linhas) {
    for (const campo of ["telefoneOsc", "telefoneUsuario"]) {
      if (linha[campo]?.length > 20) linha[campo] = linha[campo].match(/\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/)?.[0] ?? null;
    }
  }
  const dados = z.array(schema).parse(linhas);
  const hash = aplicar ? await bcrypt.hash("12345678", 12) : null;
  const executar = async tx => {
    const organizacoes = await tx.organizacao.findMany({ select: { id: true, nome: true, cnpj: true, ativa: true } });
    const usuarios = await tx.usuario.findMany({ select: { email: true } });
    const solicitacoes = await tx.solicitacaoCadastro.findMany({ select: { emailUsuario: true, nomeOsc: true, cnpj: true } });
    const emails = new Set([...usuarios.map(u => u.email), ...solicitacoes.map(s => s.emailUsuario)].map(s => s.toLowerCase()));
    const resultado = [];
    for (const linha of dados) {
      const { origemId, ...data } = linha;
      const email = data.emailUsuario || (usarProvisorios ? `osc-${String(origemId).padStart(3, "0")}@cadastro.invalid` : null);
      if (!email) { resultado.push({ origemId, nome: data.nomeOsc, resultado: "sem_email" }); continue; }
      const repetida = emails.has(email) || solicitacoes.some(s => (s.nomeOsc && normalizar(s.nomeOsc) === normalizar(data.nomeOsc)) || (data.cnpj && s.cnpj === data.cnpj));
      if (repetida) { resultado.push({ origemId, nome: data.nomeOsc, resultado: "ja_cadastrada" }); continue; }
      const osc = organizacoes.find(o => (data.cnpj && o.cnpj === data.cnpj) || normalizar(o.nome) === normalizar(data.nomeOsc));
      if (osc && !osc.ativa) { resultado.push({ origemId, nome: data.nomeOsc, resultado: "osc_existente_inativa" }); continue; }
      const solicitacao = aplicar ? await tx.solicitacaoCadastro.create({ data: {
        ...data, emailUsuario: email, senhaUsuario: hash, status: "PENDENTE",
        tipo: osc ? "VINCULO_OSC" : "NOVA_OSC", organizacaoId: osc?.id ?? null,
      }, select: { id: true } }) : null;
      emails.add(email);
      solicitacoes.push({ emailUsuario: email, nomeOsc: data.nomeOsc, cnpj: data.cnpj });
      resultado.push({ origemId, nome: data.nomeOsc, email, categoria: data.categoria, resultado: aplicar ? "pendente" : "pronta", solicitacaoId: solicitacao?.id });
    }
    return resultado;
  };
  const resultado = aplicar ? await prisma.$transaction(executar, { timeout: 30000 }) : await executar(prisma);
  await fs.writeFile(`${arquivo}.resultado.json`, JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify(resultado.reduce((a, r) => ({ ...a, [r.resultado]: (a[r.resultado] || 0) + 1 }), {})));
} finally { await prisma.$disconnect(); }
