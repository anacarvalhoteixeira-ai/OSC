export function validarAmbiente(env = process.env) {
  if (env.NODE_ENV !== "production") return;
  if (!env.JWT_SECRET || Buffer.byteLength(env.JWT_SECRET) < 32) {
    throw new Error("JWT_SECRET deve ter pelo menos 32 bytes em produção.");
  }
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL é obrigatória em produção.");
  const url = new URL(env.DATABASE_URL);
  if (!["mysql:", "mariadb:"].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) {
    throw new Error("DATABASE_URL deve apontar para um banco MySQL/MariaDB.");
  }
  if (env.FRONTEND_ORIGIN) {
    const origin = new URL(env.FRONTEND_ORIGIN);
    if (origin.protocol !== "https:" || origin.origin !== env.FRONTEND_ORIGIN) {
      throw new Error("FRONTEND_ORIGIN deve ser uma origem HTTPS, sem caminho ou barra final.");
    }
  }
}
