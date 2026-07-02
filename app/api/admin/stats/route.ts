import { NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function startOfCurrentMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

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

    const [totalEvents, ticketsSold, activeUsers, monthSales] = await Promise.all([
      prisma.event.count(),
      prisma.ticket.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.sale.aggregate({
        where: {
          status: "COMPLETED",
          paidAt: { gte: monthStart },
        },
        _count: true,
        _sum: { platformFeeAmount: true },
      }),
    ]);

    return NextResponse.json({
      totalEvents,
      ticketsSold,
      activeUsers,
      salesCompletedMonth: monthSales._count,
      platformCommissionMonth: Number(monthSales._sum.platformFeeAmount ?? 0),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
