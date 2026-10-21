import prisma from "../config/prisma.js";

const contar = (linhas, chave) =>
  Object.fromEntries(linhas.map((l) => [l[chave] ?? "sem-categoria", l._count._all]));
const somar = (objeto) => Object.values(objeto).reduce((a, b) => a + b, 0);

export async function montarPainel() {
  const [orgs, projetos, demandas, atendidos, porOsc, emAberto] = await Promise.all([
    prisma.organizacao.groupBy({ by: ["categoria"], _count: { _all: true } }),
    prisma.projeto.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.demanda.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.registroAtendimento.aggregate({ _sum: { quantidade: true } }),
    prisma.registroAtendimento.groupBy({
      by: ["organizacaoId"],
      _sum: { quantidade: true },
      orderBy: { _sum: { quantidade: "desc" } },
      take: 10,
    }),
    prisma.demanda.findMany({
      where: { status: { in: ["ABERTA", "EM_ANALISE"] } },
      select: { id: true, titulo: true, status: true, categoria: true, prazo: true, criadoEm: true, organizacao: { select: { id: true, nome: true } } },
      orderBy: { criadoEm: "desc" },
      take: 5,
    }),
  ]);

  const nomes = await prisma.organizacao.findMany({
    where: { id: { in: porOsc.map((p) => p.organizacaoId) } },
    select: { id: true, nome: true },
  });
  const nomePorId = new Map(nomes.map((n) => [n.id, n.nome]));

  const organizacoesPorCategoria = contar(orgs, "categoria");
  const projetosPorStatus = contar(projetos, "status");
  const demandasPorStatus = contar(demandas, "status");

  return {
    totais: {
      organizacoes: somar(organizacoesPorCategoria),
      projetos: somar(projetosPorStatus),
      demandas: somar(demandasPorStatus),
      pessoasAtendidas: atendidos._sum.quantidade ?? 0,
    },
    organizacoesPorCategoria,
    projetosPorStatus,
    demandasPorStatus,
    atendidosPorOrganizacao: porOsc.map((p) => ({
      organizacaoId: p.organizacaoId,
      nome: nomePorId.get(p.organizacaoId) ?? "—",
      total: p._sum.quantidade ?? 0,
    })),
    demandasEmAberto: emAberto,
  };
}
