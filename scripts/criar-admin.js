import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/prisma.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const senha = process.env.ADMIN_SENHA;
if (!email || !senha || senha.length < 8 || Buffer.byteLength(senha, "utf8") > 72) {
  console.error("Defina ADMIN_EMAIL e ADMIN_SENHA (8 a 72 bytes) no .env.");
  process.exit(1);
}

const hash = await bcrypt.hash(senha, 12);
const admin = await prisma.usuario.upsert({
  where: { email },
  update: { senha: hash, papel: "ADMIN", organizacaoId: null, ativo: true },
  create: { nome: process.env.ADMIN_NOME || "Administrador", email, senha: hash, papel: "ADMIN", organizacaoId: null, ativo: true },
  select: { id: true, email: true },
});
console.log(`Admin pronto: ${admin.email} (id ${admin.id}).`);
await prisma.$disconnect();
