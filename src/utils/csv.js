// CSV para Excel pt-BR: separador ";" e BOM UTF-8 para acentos.
function celula(valor) {
  if (valor === null || valor === undefined) return "";
  let texto = valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor);
  // Evita injeção de fórmulas ao abrir no Excel/Sheets
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  if (/[;"\n\r]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export function gerarCsv(colunas, linhas) {
  const cabecalho = colunas.map((c) => celula(c.titulo)).join(";");
  const corpo = linhas.map((linha) => colunas.map((c) => celula(c.valor(linha))).join(";"));
  return "\uFEFF" + [cabecalho, ...corpo].join("\r\n");
}
