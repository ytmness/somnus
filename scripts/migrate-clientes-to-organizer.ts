/**
 * Migra usuarios con rol CLIENTE a ORGANIZER.
 * Ejecutar: npx tsx scripts/migrate-clientes-to-organizer.ts
 */

import { prisma } from "../lib/db/prisma";

async function main() {
  const result = await prisma.user.updateMany({
    where: { role: "CLIENTE" },
    data: { role: "ORGANIZER" },
  });

  console.log(`Migrados ${result.count} usuarios de CLIENTE → ORGANIZER`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
