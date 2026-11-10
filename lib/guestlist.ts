import type { GuestListStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const GUESTLIST_STATUS_LABELS: Record<GuestListStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  USED: "Canjeada",
  CANCELLED: "Cancelada",
};

export function guestListErrorMessage(
  status: GuestListStatus | null | undefined,
  opts?: { claimedByOther?: boolean; notFound?: boolean }
): string {
  if (opts?.notFound) return "Esta invitación no existe o ya no está disponible.";
  if (opts?.claimedByOther) {
    return "Esta cortesía ya fue canjeada por otra persona.";
  }
  switch (status) {
    case "CANCELLED":
      return "Esta cortesía fue cancelada y ya no es válida.";
    case "USED":
      return "Esta cortesía ya fue canjeada.";
    default:
      return "Esta invitación no está disponible.";
  }
}

type Tx = Prisma.TransactionClient;

/**
 * Cancela una entrada de guest list y, si ya emitió boletos, los marca CANCELLED
 * (TicketStatus existente) para que no pasen en acceso.
 */
export async function cancelGuestListEntry(
  entryId: string,
  tx: Tx | typeof prisma = prisma
) {
  const entry = await tx.guestListEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      status: true,
      saleId: true,
      eventId: true,
      email: true,
      redeemedAt: true,
    },
  });

  if (!entry) return null;

  if (entry.status === "CANCELLED") {
    return entry;
  }

  let saleId = entry.saleId;

  // Entradas canjeadas antes de saleId: buscar venta guestlist del evento
  if (!saleId && entry.redeemedAt) {
    const fallbackSale = await tx.sale.findFirst({
      where: {
        eventId: entry.eventId,
        paymentMethod: "guestlist",
        status: "COMPLETED",
        ...(entry.email
          ? { buyerEmail: { equals: entry.email, mode: "insensitive" } }
          : {}),
        createdAt: {
          gte: new Date(entry.redeemedAt.getTime() - 2 * 60 * 1000),
          lte: new Date(entry.redeemedAt.getTime() + 2 * 60 * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    saleId = fallbackSale?.id ?? null;
  }

  if (saleId) {
    await tx.ticket.updateMany({
      where: { saleId, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED" },
    });
  }

  return tx.guestListEntry.update({
    where: { id: entry.id },
    data: {
      status: "CANCELLED",
      ...(saleId && !entry.saleId ? { saleId } : {}),
    },
  });
}

export function emailsMatch(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
