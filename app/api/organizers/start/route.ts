import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ensureOrganizerProfile } from "@/lib/auth/event-access";

export const dynamic = "force-dynamic";

/**
 * POST /api/organizers/start
 * Opt-in: crea perfil de organizador sin iniciar Stripe.
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const organizer = await ensureOrganizerProfile(session);

    return NextResponse.json({
      success: true,
      organizer: {
        id: organizer.id,
        businessName: organizer.businessName,
        contactEmail: organizer.contactEmail,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[organizers/start] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
