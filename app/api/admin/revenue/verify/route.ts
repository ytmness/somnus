import { NextRequest, NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { getPlatformTotalFromDb } from "@/lib/admin/revenue";
import { sumApplicationFeesInRange } from "@/lib/payments/stripe-revenue";

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
 * GET /api/admin/revenue/verify
 * Compara totales de BD vs application fees de Stripe.
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

    const filters = { from, to, eventId, organizerId };

    const [dbPlatformTotal, stripeFees] = await Promise.all([
      getPlatformTotalFromDb(filters),
      sumApplicationFeesInRange(from, to),
    ]);

    const difference = stripeFees.stripeTotalPesos - dbPlatformTotal;

    return NextResponse.json({
      database: {
        platformTotal: dbPlatformTotal,
      },
      stripe: stripeFees,
      difference,
      note:
        "platformTotal en BD = comisión Somnus + cargo de servicio por venta COMPLETED. Stripe application fees pueden diferir si hay reembolsos o ventas fuera del filtro de evento/organizador.",
    });
  } catch (error) {
    console.error("[admin/revenue/verify] Error:", error);
    return NextResponse.json(
      { error: "Error al verificar con Stripe" },
      { status: 500 }
    );
  }
}
