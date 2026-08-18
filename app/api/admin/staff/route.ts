import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/session";
import {
  createStaffMembership,
  createStaffInvite,
  STAFF_MEMBERSHIP_INCLUDE,
} from "@/lib/staff/memberships";
import type { StaffRole, MembershipScope } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/staff
 * Lista membresías PLATFORM y todas las membresías (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") as MembershipScope | null;

    const memberships = await prisma.staffMembership.findMany({
      where: scope ? { scope } : undefined,
      include: STAFF_MEMBERSHIP_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    const pendingInvites = await prisma.staffInvite.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: memberships,
      pendingInvites,
    });
  } catch (error) {
    console.error("GET admin/staff error:", error);
    return NextResponse.json({ error: "Error al obtener equipo" }, { status: 500 });
  }
}

/**
 * POST /api/admin/staff
 * Crear membresía PLATFORM o invitar por email
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      userId,
      role,
      scope = "PLATFORM",
      organizerId,
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
          assignedById: user!.id,
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
        invitedById: user!.id,
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
      assignedById: user!.id,
    });

    return NextResponse.json({ success: true, data: membership }, { status: 201 });
  } catch (error) {
    console.error("POST admin/staff error:", error);
    return NextResponse.json({ error: "Error al asignar rol" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/staff
 * Activar/desactivar membresía
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id, isActive } = await request.json();
    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "id e isActive requeridos" }, { status: 400 });
    }

    const updated = await prisma.staffMembership.update({
      where: { id },
      data: { isActive },
      include: STAFF_MEMBERSHIP_INCLUDE,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH admin/staff error:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/staff?id=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    await prisma.staffMembership.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE admin/staff error:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
