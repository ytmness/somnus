/**
 * Crear usuario ADMIN — solo Prisma (sin Supabase)
 * npx tsx scripts/create-admin-user.ts
 * ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD=secreto npx tsx scripts/create-admin-user.ts
 */
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db/prisma";

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@somnus.com").toLowerCase();
  const name = process.env.ADMIN_NAME || "Administrador Somnus";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  console.log("Creando/actualizando usuario ADMIN...\n");

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      role: "ADMIN",
      password: hashed,
      isActive: true,
      emailVerified: true,
    },
    update: {
      role: "ADMIN",
      isActive: true,
      password: hashed,
      emailVerified: true,
      name,
    },
  });

  console.log("Listo:");
  console.log(`  Email: ${user.email}`);
  console.log(`  Password: ${password}`);
  console.log("  Login en /login y luego /admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
