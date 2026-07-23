import { NextRequest, NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/session";
import { resetOrganizerStripe } from "@/lib/admin/reset-organizer-stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/organizers/[id]/reset-stripe
 * Resetea campos Stripe de un organizador para forzar re-onboarding
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const result = await resetOrganizerStripe(params.id);

    return NextResponse.json({
      success: true,
      data: result,
      message:
        "Stripe reseteado. El organizador debe volver a completar onboarding en /organizador.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al resetear Stripe";
    const status = msg === "Organizador no encontrado" ? 404 : 500;
    console.error("POST admin/organizers/[id]/reset-stripe error:", error);
    return NextResponse.json({ error: msg }, { status });
  }
}
