/**
 * Asignar rol a un usuario por email
 * Ejecutar: ADMIN_EMAIL=sergiooresa@gmail.com ADMIN_ROLE=ADMIN npx tsx scripts/set-user-role.ts
 *
 * Roles: ADMIN | ORGANIZER | VENDEDOR | SUPERVISOR | ACCESOS | CLIENTE
 */

import { prisma } from "../lib/db/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL || process.env.USER_EMAIL;
  const role = (process.env.ADMIN_ROLE || process.env.USER_ROLE || "CLIENTE") as
    | "ADMIN"
    | "ORGANIZER"
    | "VENDEDOR"
    | "SUPERVISOR"
    | "ACCESOS"
    | "CLIENTE";

  if (!email) {
    console.error("❌ Falta el email. Usa: ADMIN_EMAIL=tu@email.com npx tsx scripts/set-user-role.ts");
    console.error("   Para cambiar rol: ADMIN_EMAIL=... ADMIN_ROLE=ADMIN npx tsx scripts/set-user-role.ts");
    process.exit(1);
  }

  const validRoles = ["ADMIN", "ORGANIZER", "VENDEDOR", "SUPERVISOR", "ACCESOS", "CLIENTE"];
  if (!validRoles.includes(role)) {
    console.error(`❌ Rol inválido: ${role}. Usa: ${validRoles.join(" | ")}`);
    process.exit(1);
  }

  console.log(`🔐 Asignando rol ${role} a ${email}...\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      console.error(`❌ No existe ningún usuario con email: ${email}`);
      console.error("   El usuario debe haberse registrado antes (login OTP crea el usuario).");
      process.exit(1);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role, isActive: true },
    });

    console.log("✅ Rol actualizado");
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Nombre: ${user.name}`);
    console.log(`🔑 Rol: ${role}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
