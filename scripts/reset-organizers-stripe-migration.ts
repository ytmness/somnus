/**
 * Resetea cuentas Stripe Connect de organizadores tras migrar la plataforma a México.
 * Las cuentas Express bajo la plataforma US (Archstack) no son reutilizables.
 *
 * Uso en VPS:
 *   cd /var/www/somnus && npx tsx scripts/reset-organizers-stripe-migration.ts
 */
import { PrismaClient } from "@prisma/client";
import { resetAllOrganizersStripe } from "../lib/admin/reset-organizer-stripe";

const prisma = new PrismaClient();

async function main() {
  const organizers = await prisma.organizer.findMany({
    where: { stripeAccountId: { not: null } },
    select: {
      id: true,
      businessName: true,
      stripeAccountId: true,
      stripeOnboardingStatus: true,
    },
  });

  if (organizers.length === 0) {
    console.log("No hay organizadores con cuenta Stripe que resetear.");
    return;
  }

  console.log(`Reseteando ${organizers.length} organizador(es):`);
  for (const org of organizers) {
    console.log(`  - ${org.businessName || org.id}: ${org.stripeAccountId}`);
  }

  const count = await resetAllOrganizersStripe();

  console.log(`\nListo: ${count} organizador(es) deben volver a onboarding en /organizador.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
