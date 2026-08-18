/**
 * Crear usuario ACCESOS — solo Prisma
 * npx tsx scripts/create-accesos-user.ts
 */
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db/prisma";

async function main() {
  const email = "accesos@boletera.com";
  const name = "Operador de Accesos";
  const password = process.env.ACCESOS_PASSWORD || "ChangeMe123!";
  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      role: "ACCESOS",
      password: hashed,
      isActive: true,
      emailVerified: true,
    },
    update: {
      role: "ACCESOS",
      isActive: true,
      password: hashed,
      emailVerified: true,
    },
  });

  console.log("Usuario ACCESOS listo:");
  console.log(`  Email: ${user.email}`);
  console.log(`  Password: ${password}`);
  console.log("  Ir a /login → /accesos");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
