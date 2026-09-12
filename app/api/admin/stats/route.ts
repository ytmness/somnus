import { NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { startOfCurrentMonth } from "@/lib/datetime";
import { SOLD_TICKET_WHERE } from "@/lib/tickets/sold";

export const dynamic = "force-dynamic";

const completedThisMonth = (monthStart: Date) => ({
  status: "COMPLETED" as const,
  OR: [
    { paidAt: { gte: monthStart } },
    { paidAt: null, createdAt: { gte: monthStart } },
  ],
});

/**
 * GET /api/admin/stats
 * Estadísticas del panel de administración (solo ADMIN)
 */
export async function GET() {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const monthStart = startOfCurrentMonth();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const monthWhere = completedThisMonth(monthStart);

    const [
      totalEvents,
      ticketsSold,
      ticketsSoldMonth,
      ticketsUsed,
      activeUsers,
      monthSales,
      organizersPendingStripe,
      newContactLeads,
      events,
      soldTickets,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.ticket.count({ where: SOLD_TICKET_WHERE }),
      prisma.ticket.count({
        where: {
          ...SOLD_TICKET_WHERE,
          sale: monthWhere,
        },
      }),
      prisma.ticket.count({
        where: {
          status: "USED",
          sale: { status: "COMPLETED" },
        },
      }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.sale.aggregate({
        where: monthWhere,
        _count: true,
        _sum: { platformFeeAmount: true },
      }),
      prisma.organizer.count({
        where: { isActive: true, chargesEnabled: false },
      }),
      prisma.contactLead.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.event.findMany({
        select: {
          id: true,
          name: true,
          eventDate: true,
          ticketTypes: { select: { maxQuantity: true } },
        },
        orderBy: { eventDate: "desc" },
      }),
      prisma.ticket.findMany({
        where: SOLD_TICKET_WHERE,
        select: {
          status: true,
          sale: { select: { eventId: true } },
        },
      }),
    ]);

    const byEventId = new Map<
      string,
      { sold: number; used: number }
    >();
    for (const t of soldTickets) {
      const eventId = t.sale.eventId;
      const row = byEventId.get(eventId) ?? { sold: 0, used: 0 };
      row.sold += 1;
      if (t.status === "USED") row.used += 1;
      byEventId.set(eventId, row);
    }

    const soldByEvent = events
      .map((event) => {
        const counts = byEventId.get(event.id) ?? { sold: 0, used: 0 };
        const capacity = event.ticketTypes.reduce(
          (sum, tt) => sum + tt.maxQuantity,
          0
        );
        return {
          id: event.id,
          name: event.name,
          eventDate: event.eventDate.toISOString(),
          sold: counts.sold,
          used: counts.used,
          capacity,
        };
      })
      .filter((e) => e.sold > 0 || e.capacity > 0)
      .sort((a, b) => b.sold - a.sold || b.eventDate.localeCompare(a.eventDate));

    return NextResponse.json({
      totalEvents,
      ticketsSold,
      ticketsSoldMonth,
      ticketsUsed,
      activeUsers,
      salesCompletedMonth: monthSales._count,
      platformCommissionMonth: Number(monthSales._sum.platformFeeAmount ?? 0),
      organizersPendingStripe,
      newContactLeads,
      soldByEvent,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
