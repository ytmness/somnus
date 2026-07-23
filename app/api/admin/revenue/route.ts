import { NextRequest, NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/session";
import { getRevenueReport } from "@/lib/admin/revenue";

export const dynamic = "force-dynamic";

function parseDateParam(value: string | null, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

/**
 * GET /api/admin/revenue
 * Reporte de ingresos y comisiones (solo ADMIN).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"), true);
    const eventId = searchParams.get("eventId") || undefined;
    const organizerId = searchParams.get("organizerId") || undefined;

    const report = await getRevenueReport({ from, to, eventId, organizerId });

    return NextResponse.json(report);
  } catch (error) {
    console.error("[admin/revenue] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener ingresos" },
      { status: 500 }
    );
  }
}
