/**
 * Limpieza segura de intentos / ventas de prueba y recálculo de inventario.
 *
 *   npx tsx scripts/reconcile-payments-cleanup.ts           # dry-run
 *   npx tsx scripts/reconcile-payments-cleanup.ts --apply   # aplica
 *
 * 1) Cancela PaymentIntents incompletos y marca ventas PENDING viejas como CANCELLED
 * 2) Revierte ventas COMPLETED sin Stripe real (manual / guestlist $0) → REFUNDED
 * 3) Cancela boletos huérfanos de ventas REFUNDED que sigan VALID
 * 4) Recalcula soldQuantity desde boletos COMPLETED no cancelados
 */
import { PrismaClient } from "@prisma/client";
import {
  recalculateSoldQuantities,
  reverseSale,
} from "../lib/payments/fulfill-sale";
import { getStripe } from "../lib/payments/stripe";

const APPLY = process.argv.includes("--apply");
const PENDING_GRACE_MS = 30 * 60 * 1000; // no tocar checkouts activos < 30 min

const prisma = new PrismaClient();

async function cancelIncompletePaymentIntents() {
  const stripe = getStripe();
  const list = await stripe.paymentIntents.list({ limit: 100 });
  const incomplete = list.data.filter(
    (pi) =>
      pi.status === "requires_payment_method" ||
      pi.status === "requires_confirmation" ||
      pi.status === "requires_action"
  );

  console.log(`[PI] incompletos encontrados: ${incomplete.length}`);
  let canceled = 0;
  for (const pi of incomplete) {
    console.log(
      `  - ${pi.id} ${pi.status} $${(pi.amount / 100).toFixed(2)} sale=${pi.metadata?.saleId?.slice(0, 8) || "?"}`
    );
    if (!APPLY) continue;
    try {
      await stripe.paymentIntents.cancel(pi.id);
      canceled++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`    no se pudo cancelar ${pi.id}: ${msg}`);
    }
  }
  return { found: incomplete.length, canceled };
}

async function cancelStalePendingSales() {
  const cutoff = new Date(Date.now() - PENDING_GRACE_MS);
  const pending = await prisma.sale.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
    },
    select: {
      id: true,
      buyerEmail: true,
      total: true,
      createdAt: true,
      paymentIntentId: true,
      providerStatus: true,
      _count: { select: { tickets: true } },
    },
  });

  console.log(
    `[PENDING] ventas a cancelar (>${PENDING_GRACE_MS / 60000}min, sin tocar activas): ${pending.length}`
  );
  for (const s of pending) {
    console.log(
      `  - ${s.id.slice(0, 8)} ${s.buyerEmail} $${Number(s.total)} tickets=${s._count.tickets} piStatus=${s.providerStatus}`
    );
  }

  if (!APPLY || pending.length === 0) {
    return { found: pending.length, canceled: 0 };
  }

  const result = await prisma.sale.updateMany({
    where: {
      id: { in: pending.map((s) => s.id) },
      status: "PENDING",
      // seguridad: nunca tocar si ya tienen boletos
      tickets: { none: {} },
    },
    data: {
      status: "CANCELLED",
      providerStatus: "canceled",
    },
  });

  return { found: pending.length, canceled: result.count };
}

async function reverseNonStripeTestSales() {
  // Solo ventas manuales de prueba (POS). Guestlist reales NO se tocan.
  const targets = await prisma.sale.findMany({
    where: {
      status: "COMPLETED",
      paymentMethod: "manual",
      paymentProvider: "manual",
    },
    select: {
      id: true,
      buyerEmail: true,
      total: true,
      paymentMethod: true,
      paymentProvider: true,
      _count: { select: { tickets: true } },
    },
  });

  console.log(`[TEST/MANUAL] ventas a revertir: ${targets.length}`);
  for (const s of targets) {
    console.log(
      `  - ${s.id.slice(0, 8)} ${s.paymentMethod}/${s.paymentProvider} $${Number(s.total)} ${s.buyerEmail} tickets=${s._count.tickets}`
    );
  }

  if (!APPLY) return { found: targets.length, reversed: 0 };

  let reversed = 0;
  for (const s of targets) {
    await reverseSale(s.id);
    reversed++;
  }
  return { found: targets.length, reversed };
}

async function cancelOrphanTicketsOnRefundedSales() {
  const orphans = await prisma.ticket.findMany({
    where: {
      status: "VALID",
      sale: { status: { in: ["REFUNDED", "CANCELLED"] } },
    },
    select: {
      id: true,
      ticketNumber: true,
      ticketTypeId: true,
      sale: { select: { id: true, status: true, buyerEmail: true } },
    },
  });

  console.log(`[ORPHAN TICKETS] VALID en ventas refunded/cancelled: ${orphans.length}`);
  for (const t of orphans) {
    console.log(
      `  - ${t.ticketNumber} sale=${t.sale.id.slice(0, 8)} (${t.sale.status}) ${t.sale.buyerEmail}`
    );
  }

  if (!APPLY || orphans.length === 0) {
    return { found: orphans.length, canceled: 0 };
  }

  await prisma.ticket.updateMany({
    where: { id: { in: orphans.map((t) => t.id) } },
    data: { status: "CANCELLED" },
  });

  return { found: orphans.length, canceled: orphans.length };
}

async function main() {
  console.log(`\n=== reconcile-payments-cleanup (${APPLY ? "APPLY" : "DRY-RUN"}) ===\n`);

  const pi = await cancelIncompletePaymentIntents();
  const pending = await cancelStalePendingSales();
  const tests = await reverseNonStripeTestSales();
  const orphans = await cancelOrphanTicketsOnRefundedSales();

  let inventory = { updated: 0 };
  if (APPLY) {
    inventory = await recalculateSoldQuantities();
  } else {
    console.log("[INVENTORY] se recalculará soldQuantity con --apply");
  }

  console.log("\n=== RESUMEN ===");
  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "APPLY" : "DRY-RUN",
        paymentIntents: pi,
        pendingSales: pending,
        testSales: tests,
        orphanTickets: orphans,
        inventoryTypesUpdated: inventory.updated,
      },
      null,
      2
    )
  );

  if (!APPLY) {
    console.log("\nSin cambios. Re-ejecuta con --apply para aplicar.\n");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
