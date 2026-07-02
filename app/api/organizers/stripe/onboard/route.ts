import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/supabase-auth";
import { prisma } from "@/lib/db/prisma";
import {
  createConnectedAccount,
  createAccountLink,
  syncOrganizerStripeStatus,
} from "@/lib/payments/connect";
import { getAppUrl } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/organizers/stripe/onboard
 * Inicia o continúa el onboarding de Stripe Connect para el organizador actual.
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    let organizer = await prisma.organizer.findUnique({
      where: { userId: session.id },
    });

    if (!organizer) {
      organizer = await prisma.organizer.create({
        data: {
          userId: session.id,
          businessName: session.name,
          contactEmail: session.email,
        },
      });
    }

    const stripeAccountId = await createConnectedAccount(organizer.id);
    const appUrl = getAppUrl();
    const returnUrl = `${appUrl}/organizador?stripe=return`;
    const refreshUrl = `${appUrl}/organizador?stripe=refresh`;

    const url = await createAccountLink(stripeAccountId, returnUrl, refreshUrl);

    return NextResponse.json({ url, stripeAccountId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const code = (error as Error & { code?: string }).code;
    console.error("[organizers/stripe/onboard] Error:", msg);
    if (code === "STRIPE_CONNECT_NOT_ENABLED" || msg.includes("signed up for Connect")) {
      return NextResponse.json(
        {
          error:
            "Stripe Connect aún no está activado en Somnus. Contacta al administrador para activarlo en el Dashboard de Stripe.",
          code: "STRIPE_CONNECT_NOT_ENABLED",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/organizers/stripe/status
 * Estado actual de la cuenta conectada del organizador.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    let organizer = await prisma.organizer.findUnique({
      where: { userId: session.id },
      include: {
        events: {
          select: { id: true, name: true, eventDate: true, isActive: true },
          orderBy: { eventDate: "desc" },
        },
        organizations: {
          select: { id: true, name: true, isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!organizer) {
      return NextResponse.json({
        hasOrganizer: false,
        status: null,
        organizations: [],
      });
    }

    const status = organizer.stripeAccountId
      ? await syncOrganizerStripeStatus(organizer.id)
      : {
          stripeAccountId: null,
          stripeOnboardingStatus: organizer.stripeOnboardingStatus,
          chargesEnabled: false,
          payoutsEnabled: false,
          requirementsDue: [] as string[],
          isReady: false,
        };

    const sales = await prisma.sale.findMany({
      where: {
        event: { organizerId: organizer.id },
        status: "COMPLETED",
      },
      select: {
        id: true,
        total: true,
        platformFeeAmount: true,
        organizerNetAmount: true,
        providerStatus: true,
        paidAt: true,
        event: { select: { name: true } },
      },
      orderBy: { paidAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      hasOrganizer: true,
      organizer: {
        id: organizer.id,
        businessName: organizer.businessName,
        contactEmail: organizer.contactEmail,
      },
      status,
      events: organizer.events,
      organizations: organizer.organizations,
      recentSales: sales,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[organizers/stripe/status] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
