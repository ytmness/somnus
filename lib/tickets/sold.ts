import type { Prisma } from "@prisma/client";

/** Boleto vendido de verdad: pago completado y no cancelado (VALID, USED o REPRINTED). */
export const SOLD_TICKET_WHERE = {
  status: { not: "CANCELLED" },
  sale: { status: "COMPLETED" },
} satisfies Prisma.TicketWhereInput;
