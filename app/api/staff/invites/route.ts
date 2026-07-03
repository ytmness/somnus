import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/supabase-auth";
import { getOrganizerForUser } from "@/lib/auth/event-access";
import { canManageTeam } from "@/lib/auth/permissions";
import { createStaffInvite } from "@/lib/staff/memberships";
import type { StaffRole, MembershipScope } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/staff/invites
 * Crear invitación (ADMIN u ORGANIZER)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      role,
      scope,
      organizerId: bodyOrganizerId,
      organizationId,
      venueId,
      eventId,
      tableNumber,
    } = body as {
      email: string;
      role: StaffRole;
      scope: MembershipScope;
      organizerId?: string;
      organizationId?: string;
      venueId?: string;
      eventId?: string;
      tableNumber?: string;
    };

    if (!email || !role || !scope) {
      return NextResponse.json(
        { error: "email, role y scope son requeridos" },
        { status: 400 }
      );
    }

    let organizerId = bodyOrganizerId;
    if (user.role === "ORGANIZER") {
      const organizer = await getOrganizerForUser(user.id);
      organizerId = organizer?.id;
    }

    if (scope !== "PLATFORM" && !organizerId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "organizerId requerido" }, { status: 400 });
    }

    if (scope === "PLATFORM" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo admin puede invitar scope PLATFORM" }, { status: 403 });
    }

    const canManage = await canManageTeam(user, { scope, organizerId });
    if (!canManage) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const invite = await createStaffInvite({
      email,
      role,
      scope,
      organizerId,
      organizationId,
      venueId,
      eventId,
      tableNumber,
      invitedById: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: invite,
        inviteUrl: `/invitacion/${invite.token}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST staff/invites error:", error);
    return NextResponse.json({ error: "Error al crear invitación" }, { status: 500 });
  }
}
