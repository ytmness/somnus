import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { getOrganizerForUser } from "@/lib/auth/event-access";
import { canManageTeam } from "@/lib/auth/permissions";
import {
  createStaffMembership,
  createStaffInvite,
  STAFF_MEMBERSHIP_INCLUDE,
} from "@/lib/staff/memberships";
import type { StaffRole, MembershipScope } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/organizers/staff
 * Equipo del organizador actual
 */
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const organizer = await getOrganizerForUser(user.id);
    if (!organizer && user.role !== "ADMIN") {
      return NextResponse.json({ success: true, data: [], pendingInvites: [] });
    }

    const organizerId = organizer?.id;
    const where =
      user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { organizerId },
              { event: { organizerId } },
              { venue: { organizerId } },
              { organization: { organizerId } },
            ],
          };

    const memberships = await prisma.staffMembership.findMany({
      where,
      include: STAFF_MEMBERSHIP_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    const pendingInvites = await prisma.staffInvite.findMany({
      where: {
        acceptedAt: null,
        expiresAt: { gt: new Date() },
        ...(organizerId ? { organizerId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: memberships,
      pendingInvites,
      organizerId,
    });
  } catch (error) {
    console.error("GET organizers/staff error:", error);
    return NextResponse.json({ error: "Error al obtener equipo" }, { status: 500 });
  }
}

/**
 * POST /api/organizers/staff
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const organizer = await getOrganizerForUser(user.id);
    if (!organizer && user.role !== "ADMIN") {
      return NextResponse.json({ error: "No eres organizador" }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      userId,
      role,
      scope = "ORGANIZER",
      organizerId: bodyOrganizerId,
      organizationId,
      venueId,
      eventId,
      tableNumber,
      inviteOnly = false,
    } = body as {
      email?: string;
      userId?: string;
      role: StaffRole;
      scope?: MembershipScope;
      organizerId?: string;
      organizationId?: string;
      venueId?: string;
      eventId?: string;
      tableNumber?: string;
      inviteOnly?: boolean;
    };

    if (!role) {
      return NextResponse.json({ error: "Rol requerido" }, { status: 400 });
    }

    if (scope === "PLATFORM") {
      return NextResponse.json({ error: "Scope PLATFORM solo para admin" }, { status: 403 });
    }

    const organizerId = organizer?.id ?? body.organizerId;
    const canManage = await canManageTeam(user, { scope, organizerId });
    if (!canManage) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (inviteOnly || email) {
      if (!email) {
        return NextResponse.json({ error: "Email requerido" }, { status: 400 });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (existingUser && !inviteOnly) {
        const membership = await createStaffMembership({
          userId: existingUser.id,
          role,
          scope,
          organizerId,
          organizationId,
          venueId,
          eventId,
          tableNumber,
          assignedById: user.id,
        });
        return NextResponse.json({ success: true, data: membership }, { status: 201 });
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
    }

    if (!userId) {
      return NextResponse.json({ error: "userId o email requerido" }, { status: 400 });
    }

    const membership = await createStaffMembership({
      userId,
      role,
      scope,
      organizerId,
      organizationId,
      venueId,
      eventId,
      tableNumber,
      assignedById: user.id,
    });

    return NextResponse.json({ success: true, data: membership }, { status: 201 });
  } catch (error) {
    console.error("POST organizers/staff error:", error);
    return NextResponse.json({ error: "Error al asignar rol" }, { status: 500 });
  }
}

/**
 * PATCH /api/organizers/staff — activar/desactivar
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id, isActive } = await request.json();
    const membership = await prisma.staffMembership.findUnique({
      where: { id },
      select: { organizerId: true, scope: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const canManage = await canManageTeam(user, {
      scope: membership.scope,
      organizerId: membership.organizerId,
    });
    if (!canManage) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const updated = await prisma.staffMembership.update({
      where: { id },
      data: { isActive },
      include: STAFF_MEMBERSHIP_INCLUDE,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH organizers/staff error:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

/**
 * DELETE /api/organizers/staff?id=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    const membership = await prisma.staffMembership.findUnique({
      where: { id },
      select: { organizerId: true, scope: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const canManage = await canManageTeam(user, {
      scope: membership.scope,
      organizerId: membership.organizerId,
    });
    if (!canManage) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.staffMembership.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE organizers/staff error:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
