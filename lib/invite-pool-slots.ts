import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient | typeof prisma;

const BATCH_WINDOW_MS = 15_000;

function batchKey(email: string | null, name: string, createdAt: Date): string {
  const who = (email || name || "").trim().toLowerCase();
  const bucket = Math.floor(createdAt.getTime() / BATCH_WINDOW_MS);
  return `${who}|${bucket}`;
}

/**
 * Cancela asientos PENDING huérfanos de un money-pool / mesa.
 * Conserva el lote de un checkout aún abierto (sale PENDING + hermanos del mismo batch).
 */
export async function cancelOrphanPendingPoolSlots(
  poolId: string,
  db: Db = prisma
): Promise<number> {
  const pending = await db.tableSlotInvite.findMany({
    where: { poolId, status: "PENDING" },
    include: {
      sale: { select: { id: true, status: true } },
    },
  });

  if (pending.length === 0) return 0;

  const anchoredBatches = new Set<string>();
  for (const slot of pending) {
    if (slot.sale?.status === "PENDING") {
      anchoredBatches.add(
        batchKey(slot.invitedEmail, slot.invitedName, slot.createdAt)
      );
    }
  }

  const orphanIds = pending
    .filter((slot) => {
      if (slot.sale?.status === "PENDING") return false;
      const key = batchKey(slot.invitedEmail, slot.invitedName, slot.createdAt);
      if (anchoredBatches.has(key)) return false;
      return true;
    })
    .map((slot) => slot.id);

  if (orphanIds.length === 0) return 0;

  await db.tableSlotInvite.updateMany({
    where: { id: { in: orphanIds } },
    data: { status: "CANCELLED" },
  });

  return orphanIds.length;
}

/**
 * IDs de asientos a marcar PAID al completar una venta de pool (sin fantasma).
 * Prioriza el invite primario y hermanos del mismo batch de creación.
 */
export async function resolvePoolSlotIdsToMarkPaid(
  opts: {
    poolId: string;
    primaryInviteId: string;
    invitedEmail: string | null;
    invitedName: string;
    primaryCreatedAt: Date;
    quantity: number;
  },
  db: Db = prisma
): Promise<string[]> {
  const qty = Math.max(1, opts.quantity);
  const pending = await db.tableSlotInvite.findMany({
    where: {
      poolId: opts.poolId,
      status: "PENDING",
    },
    orderBy: [{ createdAt: "asc" }, { seatNumber: "asc" }],
    select: {
      id: true,
      createdAt: true,
      invitedEmail: true,
      invitedName: true,
    },
  });

  const primaryKey = batchKey(
    opts.invitedEmail,
    opts.invitedName,
    opts.primaryCreatedAt
  );

  const emailNorm = (opts.invitedEmail || "").trim().toLowerCase();
  const sameBuyer = pending.filter((s) => {
    if (s.id === opts.primaryInviteId) return true;
    const sEmail = (s.invitedEmail || "").trim().toLowerCase();
    if (emailNorm && sEmail && sEmail === emailNorm) return true;
    if (!emailNorm && s.invitedName === opts.invitedName) return true;
    return false;
  });

  const sameBatch = sameBuyer.filter((s) => {
    if (s.id === opts.primaryInviteId) return true;
    return (
      batchKey(s.invitedEmail, s.invitedName, s.createdAt) === primaryKey
    );
  });

  const ordered = [
    ...sameBatch.filter((s) => s.id === opts.primaryInviteId),
    ...sameBatch.filter((s) => s.id !== opts.primaryInviteId),
  ];

  const ids = ordered.slice(0, qty).map((s) => s.id);
  if (!ids.includes(opts.primaryInviteId)) {
    ids.unshift(opts.primaryInviteId);
  }
  return Array.from(new Set(ids)).slice(0, qty);
}

/** Siguiente seatNumber libre (solo cuenta PAID; PENDING huérfanos deben cancelarse antes). */
export async function nextPoolSeatNumber(
  poolId: string,
  db: Db = prisma
): Promise<number> {
  const agg = await db.tableSlotInvite.aggregate({
    where: {
      poolId,
      status: { in: ["PAID", "PENDING"] },
    },
    _max: { seatNumber: true },
  });
  return (agg._max.seatNumber ?? 0) + 1;
}
