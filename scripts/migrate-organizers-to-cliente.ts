/**
 * Migra usuarios con rol ORGANIZER a CLIENTE (comprador).
 * No toca ADMIN ni roles operativos (VENDEDOR, SUPERVISOR, ACCESOS).
 *
 * Ejecutar: npx tsx scripts/migrate-organizers-to-cliente.ts
 */
import { prisma } from "../lib/db/prisma";

async function main() {
  const result = await prisma.user.updateMany({
    where: { role: "ORGANIZER" },
    data: { role: "CLIENTE" },
  });

  console.log(`Migrados ${result.count} usuarios de ORGANIZER → CLIENTE`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
