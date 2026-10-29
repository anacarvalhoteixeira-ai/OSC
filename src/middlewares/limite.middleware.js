// Limite por processo. Para múltiplas réplicas, aplicar também um limite no proxy.
export function limitarRequisicoes({ maximo, janelaMs = 15 * 60 * 1000, agora = Date.now }) {
  const clientes = new Map();
  const limpeza = setInterval(() => {
    const tempo = agora();
    for (const [ip, registro] of clientes) if (registro.fim <= tempo) clientes.delete(ip);
  }, janelaMs);
  limpeza.unref();
  return (req, res, next) => {
    const tempo = agora();
    const ip = req.ip || req.socket.remoteAddress;
    let registro = clientes.get(ip);
    if (!registro || registro.fim <= tempo) {
      // Memória limitada mesmo sob muitos endereços de origem.
      if (clientes.size >= 10000 && !clientes.has(ip)) {
        res.set("Retry-After", String(Math.ceil(janelaMs / 1000)));
        return res.status(429).json({ erro: "Muitas tentativas. Tente novamente mais tarde." });
      }
      registro = { total: 0, fim: tempo + janelaMs };
      clientes.set(ip, registro);
    }
    registro.total++;
    if (registro.total > maximo) {
      res.set("Retry-After", String(Math.ceil((registro.fim - tempo) / 1000)));
      return res.status(429).json({ erro: "Muitas tentativas. Tente novamente mais tarde." });
    }
    next();
  };
}
