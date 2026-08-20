/**
 * Borra datos operativos de Somnus conservando cuentas de usuario.
 *
 * CONSERVA: User, OtpCode, PasswordResetToken, Organizer, Organization, Venue,
 *           StaffMembership (sin evento), CommissionRule global/organizer, SystemConfig
 *
 * ELIMINA: eventos, ventas, boletos, escaneos, galería, leads, notificaciones,
 *          mensajes, posts, audit logs, webhooks, invites de mesas, etc.
 *
 * Uso: npx tsx scripts/wipe-operational-data.ts
 *      npx tsx scripts/wipe-operational-data.ts --yes   (sin confirmación interactiva)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function count(label: string, fn: () => Promise<number>) {
  const n = await fn();
  console.log(`  ${label}: ${n}`);
  return n;
}

async function main() {
  const skipConfirm = process.argv.includes("--yes");

  const before = {
    users: await prisma.user.count(),
    events: await prisma.event.count(),
    sales: await prisma.sale.count(),
    tickets: await prisma.ticket.count(),
  };

  console.log("Estado actual:");
  console.log(`  Usuarios (se conservan): ${before.users}`);
  console.log(`  Eventos: ${before.events}`);
  console.log(`  Ventas: ${before.sales}`);
  console.log(`  Boletos: ${before.tickets}`);

  if (!skipConfirm && before.events === 0 && before.sales === 0 && before.tickets === 0) {
    console.log("\nNo hay eventos/ventas/boletos que borrar.");
  }

  if (!skipConfirm && process.stdin.isTTY) {
    console.log(
      "\n⚠️  Esto borrará eventos, ventas, boletos y datos relacionados. Las cuentas NO se tocan."
    );
    process.stdout.write("Escribe BORRAR para continuar: ");
    const answer = await new Promise<string>((resolve) => {
      process.stdin.setEncoding("utf8");
      process.stdin.once("data", (d) => resolve(String(d).trim()));
    });
    if (answer !== "BORRAR") {
      console.log("Cancelado.");
      return;
    }
  }

  console.log("\nBorrando…");

  await prisma.$transaction(async (tx) => {
    await tx.ticketScan.deleteMany();
    await tx.ticketReprint.deleteMany();
    await tx.ticket.deleteMany();
    await tx.saleItem.deleteMany();
    await tx.sale.deleteMany();
    await tx.tableSlotInvite.deleteMany();
    await tx.tableInvitePool.deleteMany();
    await tx.ticketPricePhase.deleteMany();
    await tx.tableGroupPriceRow.deleteMany();
    await tx.ticketType.deleteMany();
    await tx.commissionRule.deleteMany({ where: { eventId: { not: null } } });
    await tx.staffMembership.deleteMany({ where: { eventId: { not: null } } });
    await tx.staffInvite.deleteMany();
    await tx.event.deleteMany();
    await tx.galleryImage.deleteMany();
    await tx.gallerySection.deleteMany();
    await tx.contactLead.deleteMany();
    await tx.notification.deleteMany();
    await tx.message.deleteMany();
    await tx.conversation.deleteMany();
    await tx.organizationPost.deleteMany();
    await tx.organizationFollow.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.paymentWebhookEvent.deleteMany();
  });

  console.log("\nListo. Estado final:");
  await count("Usuarios", () => prisma.user.count());
  await count("Organizers", () => prisma.organizer.count());
  await count("Organizations", () => prisma.organization.count());
  await count("Eventos", () => prisma.event.count());
  await count("Ventas", () => prisma.sale.count());
  await count("Boletos", () => prisma.ticket.count());
  await count("Galería (secciones)", () => prisma.gallerySection.count());
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
