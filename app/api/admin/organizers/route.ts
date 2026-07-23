import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/organizers
 * Lista todos los organizadores con orgs, Stripe y conteo de eventos
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase();

    const organizers = await prisma.organizer.findMany({
      include: {
        user: { select: { id: true, email: true, name: true, role: true, isActive: true } },
        organizations: {
          select: { id: true, name: true, isActive: true, _count: { select: { events: true } } },
          orderBy: { name: "asc" },
        },
        _count: { select: { events: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = q
      ? organizers.filter(
          (o) =>
            o.businessName.toLowerCase().includes(q) ||
            o.contactEmail.toLowerCase().includes(q) ||
            o.user.email.toLowerCase().includes(q) ||
            o.user.name.toLowerCase().includes(q)
        )
      : organizers;

    return NextResponse.json({
      success: true,
      data: filtered.map((o) => ({
        id: o.id,
        businessName: o.businessName,
        contactEmail: o.contactEmail,
        stripeAccountId: o.stripeAccountId,
        stripeOnboardingStatus: o.stripeOnboardingStatus,
        chargesEnabled: o.chargesEnabled,
        payoutsEnabled: o.payoutsEnabled,
        isActive: o.isActive,
        eventCount: o._count.events,
        user: o.user,
        organizations: o.organizations,
      })),
    });
  } catch (error) {
    console.error("GET admin/organizers error:", error);
    return NextResponse.json({ error: "Error al obtener organizadores" }, { status: 500 });
  }
}
