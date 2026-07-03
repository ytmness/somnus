/**
 * Elimina de la BD los eventos SOMNUS en PANORAMA (Feb/Mar 2026) con todos sus datos
 * dependientes (ventas, boletos, escaneos, invites), porque la API admin no borra si hay ventas.
 *
 * Uso: npx tsx scripts/delete-somnus-panorama-events.ts
 * Requiere .env.local con DATABASE_URL (misma que Supabase/Prisma).
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
import { Prisma, PrismaClient } from "@prisma/client";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

const FEB_2026_START = new Date("2026-02-01T00:00:00.000Z");
const FEB_2026_END = new Date("2026-03-01T00:00:00.000Z");
const MAR_2026_START = new Date("2026-03-01T00:00:00.000Z");
const MAR_2026_END = new Date("2026-04-01T00:00:00.000Z");

/** Coincide con los títulos que mostraste en admin */
function matchesTargetEvent(e: {
  name: string;
  eventDate: Date;
  venue: string;
  artist: string;
}): boolean {
  const name = e.name.toUpperCase();
  const venueOk = e.venue.toUpperCase().includes("PANORAMA");
  const artistOk = e.artist.toUpperCase().includes("SOMNUS");
  if (!venueOk || !artistOk) return false;

  const d = e.eventDate;
  const feb28 =
    name.includes("28") &&
    name.includes("FEBRERO") &&
    d >= FEB_2026_START &&
    d < FEB_2026_END;

  const mar26 =
    name.includes("26") &&
    name.includes("MARZO") &&
    d >= MAR_2026_START &&
    d < MAR_2026_END;

  return feb28 || mar26;
}

async function deleteEventWithSales(tx: Prisma.TransactionClient, eventId: string) {
  const sales = await tx.sale.findMany({
    where: { eventId },
    select: { id: true },
  });
  const saleIds = sales.map((s) => s.id);

  if (saleIds.length > 0) {
    const tickets = await tx.ticket.findMany({
      where: { saleId: { in: saleIds } },
      select: { id: true },
    });
    const ticketIds = tickets.map((t) => t.id);

    if (ticketIds.length > 0) {
      await tx.ticketScan.deleteMany({
        where: { ticketId: { in: ticketIds } },
      });
      await tx.ticketReprint.deleteMany({
        where: { ticketId: { in: ticketIds } },
      });
    }

    await tx.sale.updateMany({
      where: { eventId },
      data: { tableSlotInviteId: null },
    });

    await tx.sale.deleteMany({ where: { eventId } });
  }

  await tx.tableSlotInvite.deleteMany({ where: { eventId } });
  await tx.tableInvitePool.deleteMany({ where: { eventId } });

  await tx.event.delete({ where: { id: eventId } });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Falta DATABASE_URL en .env.local");
    process.exit(1);
  }

  const events = await prisma.event.findMany({
    orderBy: { eventDate: "asc" },
  });

  const targets = events.filter(matchesTargetEvent);

  if (targets.length === 0) {
    console.log("No se encontraron eventos que coincidan (SOMNUS + PANORAMA + Feb28/Mar26 2026).");
    console.log("Eventos recientes con PANORAMA:");
    const panorama = events.filter((e) =>
      e.venue.toUpperCase().includes("PANORAMA")
    );
    for (const e of panorama.slice(0, 20)) {
      console.log(
        `  - ${e.name} | ${e.artist} | ${e.eventDate.toISOString()} | ${e.id}`
      );
    }
    return;
  }

  console.log("Se eliminarán estos eventos:");
  for (const e of targets) {
    console.log(`  • ${e.name} (${e.id}) — ${e.eventDate.toISOString()}`);
  }

  for (const e of targets) {
    await prisma.$transaction((tx) => deleteEventWithSales(tx, e.id));
    console.log(`✅ Eliminado: ${e.name}`);
  }

  console.log("Listo.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
