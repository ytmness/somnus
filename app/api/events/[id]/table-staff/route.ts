import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/supabase-auth";
import { userOwnsEvent } from "@/lib/auth/event-access";
import {
  createStaffMembership,
  STAFF_MEMBERSHIP_INCLUDE,
} from "@/lib/staff/memberships";

export const dynamic = "force-dynamic";

/**
 * GET /api/events/[id]/table-staff
 * Staff MESA_HOST asignado a mesas del evento
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const owns = await userOwnsEvent(user, params.id);
    if (!owns && user.role !== "ADMIN") {
      const hostMembership = await prisma.staffMembership.findFirst({
        where: {
          userId: user.id,
          role: "MESA_HOST",
          eventId: params.id,
          isActive: true,
        },
      });
      if (!hostMembership) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }

    const memberships = await prisma.staffMembership.findMany({
      where: {
        eventId: params.id,
        role: "MESA_HOST",
        scope: "TABLE",
      },
      include: STAFF_MEMBERSHIP_INCLUDE,
      orderBy: { tableNumber: "asc" },
    });

    return NextResponse.json({ success: true, data: memberships });
  } catch (error) {
    console.error("GET events/[id]/table-staff error:", error);
    return NextResponse.json({ error: "Error al obtener staff de mesas" }, { status: 500 });
  }
}

/**
 * POST /api/events/[id]/table-staff
 * Asignar MESA_HOST a una mesa
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const owns = await userOwnsEvent(user, params.id);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, email, tableNumber } = body;

    if (!tableNumber) {
      return NextResponse.json({ error: "tableNumber requerido" }, { status: 400 });
    }

    let targetUserId = userId;
    if (!targetUserId && email) {
      const u = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (!u) {
        return NextResponse.json(
          { error: "Usuario no encontrado. Usa invitación por email." },
          { status: 404 }
        );
      }
      targetUserId = u.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "userId o email requerido" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { organizerId: true },
    });

    const membership = await createStaffMembership({
      userId: targetUserId,
      role: "MESA_HOST",
      scope: "TABLE",
      organizerId: event?.organizerId,
      eventId: params.id,
      tableNumber: String(tableNumber),
      assignedById: user.id,
    });

    return NextResponse.json({ success: true, data: membership }, { status: 201 });
  } catch (error) {
    console.error("POST events/[id]/table-staff error:", error);
    return NextResponse.json({ error: "Error al asignar anfitrión" }, { status: 500 });
  }
}

/**
 * DELETE /api/events/[id]/table-staff?membershipId=...
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const owns = await userOwnsEvent(user, params.id);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const membershipId = new URL(request.url).searchParams.get("membershipId");
    if (!membershipId) {
      return NextResponse.json({ error: "membershipId requerido" }, { status: 400 });
    }

    await prisma.staffMembership.delete({
      where: { id: membershipId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE events/[id]/table-staff error:", error);
    return NextResponse.json({ error: "Error al eliminar asignación" }, { status: 500 });
  }
}
