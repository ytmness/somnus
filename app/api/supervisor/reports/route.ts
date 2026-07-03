import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/supabase-auth";
import { canViewReports, getAccessibleEventIds } from "@/lib/auth/permissions";
import { getRevenueReport } from "@/lib/admin/revenue";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/supervisor/reports
 * Reportes scoped para supervisor
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId") || undefined;
    const organizerId = searchParams.get("organizerId") || undefined;

    const allowed = await canViewReports(user, { eventId, organizerId });
    if (!allowed) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const accessible = await getAccessibleEventIds(user);
    if (eventId && accessible !== "all" && !accessible.includes(eventId)) {
      return NextResponse.json({ error: "Evento no asignado" }, { status: 403 });
    }

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;

    const report = await getRevenueReport({
      from,
      to,
      eventId,
      organizerId,
    });

    const recentPosSales = await prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        channel: "POS",
        ...(eventId ? { eventId } : {}),
        ...(accessible !== "all" && !eventId
          ? { eventId: { in: accessible } }
          : {}),
      },
      include: {
        event: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { paidAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        report,
        recentPosSales,
        accessibleEventIds: accessible,
      },
    });
  } catch (error) {
    console.error("GET supervisor/reports error:", error);
    return NextResponse.json({ error: "Error al obtener reportes" }, { status: 500 });
  }
}
