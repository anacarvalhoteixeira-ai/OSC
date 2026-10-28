const telas = ["inicio", "oscs", "ficha-osc", "cadastro-osc", "projetos", "cadastro-projeto", "demandas", "cadastro-demanda", "relatorios", "solicitacoes"];
const pontos = [...document.querySelectorAll('main > [data-tela-placeholder]')];
const destino = new Map(pontos.map((p) => [p.dataset.telaPlaceholder, p]));
await Promise.all(telas.map(async (tela) => {
  const res = await fetch('/inicio/telas/' + tela + '/index.html');
  if (!res.ok) throw new Error('Could not load page ' + tela + '.');
  const conteudo = await res.text();
  const ponto = destino.get(tela);
  if (!ponto) throw new Error('Page placeholder missing: ' + tela + '.');
  ponto.outerHTML = conteudo;
}));
await import("../script.js");
