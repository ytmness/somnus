import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type RevenueFilters = {
  from?: Date;
  to?: Date;
  eventId?: string;
  organizerId?: string;
};

function toNumber(value: Prisma.Decimal | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

export function buildCompletedSaleWhere(
  filters: RevenueFilters
): Prisma.SaleWhereInput {
  const where: Prisma.SaleWhereInput = {
    status: "COMPLETED",
  };

  if (filters.from || filters.to) {
    where.paidAt = {};
    if (filters.from) where.paidAt.gte = filters.from;
    if (filters.to) where.paidAt.lte = filters.to;
  }

  if (filters.eventId) {
    where.eventId = filters.eventId;
  }

  if (filters.organizerId) {
    where.event = { organizerId: filters.organizerId };
  }

  return where;
}

export function buildRefundedSaleWhere(
  filters: RevenueFilters
): Prisma.SaleWhereInput {
  const where: Prisma.SaleWhereInput = {
    status: "REFUNDED",
  };

  if (filters.from || filters.to) {
    where.updatedAt = {};
    if (filters.from) where.updatedAt.gte = filters.from;
    if (filters.to) where.updatedAt.lte = filters.to;
  }

  if (filters.eventId) where.eventId = filters.eventId;
  if (filters.organizerId) {
    where.event = { organizerId: filters.organizerId };
  }

  return where;
}

export async function getRevenueReport(filters: RevenueFilters) {
  const completedWhere = buildCompletedSaleWhere(filters);
  const refundedWhere = buildRefundedSaleWhere(filters);

  const [aggregate, refundedCount, byEventGroups, recentSales, eventsMeta] =
    await Promise.all([
      prisma.sale.aggregate({
        where: completedWhere,
        _count: true,
        _sum: {
          subtotal: true,
          platformFeeAmount: true,
          tax: true,
          organizerNetAmount: true,
          total: true,
        },
      }),
      prisma.sale.count({ where: refundedWhere }),
      prisma.sale.groupBy({
        by: ["eventId"],
        where: completedWhere,
        _count: true,
        _sum: {
          subtotal: true,
          platformFeeAmount: true,
          organizerNetAmount: true,
        },
      }),
      prisma.sale.findMany({
        where: completedWhere,
        orderBy: { paidAt: "desc" },
        take: 50,
        select: {
          id: true,
          paidAt: true,
          subtotal: true,
          platformFeeAmount: true,
          organizerNetAmount: true,
          total: true,
          event: { select: { name: true } },
        },
      }),
      prisma.event.findMany({
        select: {
          id: true,
          name: true,
          organizerId: true,
          organizer: { select: { id: true, businessName: true } },
        },
      }),
    ]);

  const eventMap = new Map(
    eventsMeta.map((e) => [
      e.id,
      {
        name: e.name,
        organizerId: e.organizerId,
        organizerName: e.organizer?.businessName ?? "Sin organizador",
      },
    ])
  );

  const platformCommission = toNumber(aggregate._sum.platformFeeAmount);
  const serviceFees = toNumber(aggregate._sum.tax);

  const byEvent = byEventGroups
    .map((row) => {
      const meta = eventMap.get(row.eventId);
      return {
        eventId: row.eventId,
        eventName: meta?.name ?? "Evento desconocido",
        organizerId: meta?.organizerId ?? null,
        organizerName: meta?.organizerName ?? "Sin organizador",
        salesCount: row._count,
        subtotal: toNumber(row._sum.subtotal),
        platformCommission: toNumber(row._sum.platformFeeAmount),
        organizerNet: toNumber(row._sum.organizerNetAmount),
      };
    })
    .sort((a, b) => b.platformCommission - a.platformCommission);

  const organizerAgg = new Map<
    string,
    {
      organizerId: string;
      businessName: string;
      salesCount: number;
      platformCommission: number;
      organizerNet: number;
    }
  >();

  for (const row of byEvent) {
    const key = row.organizerId ?? "__platform__";
    const existing = organizerAgg.get(key) ?? {
      organizerId: key,
      businessName:
        key === "__platform__" ? "Somnus (sin organizador)" : row.organizerName,
      salesCount: 0,
      platformCommission: 0,
      organizerNet: 0,
    };
    existing.salesCount += row.salesCount;
    existing.platformCommission += row.platformCommission;
    existing.organizerNet += row.organizerNet;
    organizerAgg.set(key, existing);
  }

  const byOrganizer = Array.from(organizerAgg.values()).sort(
    (a, b) => b.platformCommission - a.platformCommission
  );

  return {
    summary: {
      salesCount: aggregate._count,
      gmvSubtotal: toNumber(aggregate._sum.subtotal),
      platformCommission,
      serviceFees,
      platformTotal: platformCommission + serviceFees,
      organizerPayouts: toNumber(aggregate._sum.organizerNetAmount),
      buyerTotal: toNumber(aggregate._sum.total),
      refundedCount,
    },
    byEvent,
    byOrganizer,
    recentSales: recentSales.map((s) => ({
      id: s.id,
      eventName: s.event.name,
      paidAt: s.paidAt?.toISOString() ?? null,
      subtotal: toNumber(s.subtotal),
      platformFeeAmount: toNumber(s.platformFeeAmount),
      organizerNetAmount: toNumber(s.organizerNetAmount),
      total: toNumber(s.total),
    })),
  };
}

export async function getPlatformTotalFromDb(filters: RevenueFilters) {
  const report = await getRevenueReport(filters);
  return report.summary.platformTotal;
}
