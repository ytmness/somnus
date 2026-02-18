import { NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

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

    const [totalEvents, ticketsSold, activeUsers] = await Promise.all([
      prisma.event.count(),
      prisma.ticket.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      totalEvents,
      ticketsSold,
      activeUsers,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
