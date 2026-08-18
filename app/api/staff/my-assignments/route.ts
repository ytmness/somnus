import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import {
  getAccessibleEventIds,
  getUserMemberships,
} from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/staff/my-assignments
 * Eventos, venues y mesas asignados al usuario staff
 */
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const memberships = await getUserMemberships(user.id);
    const eventIds = await getAccessibleEventIds(user);

    let events: Array<{
      id: string;
      name: string;
      venue: string;
      eventDate: Date;
      eventTime: string;
    }> = [];

    if (eventIds === "all") {
      events = await prisma.event.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          venue: true,
          eventDate: true,
          eventTime: true,
        },
        orderBy: { eventDate: "asc" },
      });
    } else if (eventIds.length > 0) {
      events = await prisma.event.findMany({
        where: { id: { in: eventIds }, isActive: true },
        select: {
          id: true,
          name: true,
          venue: true,
          eventDate: true,
          eventTime: true,
        },
        orderBy: { eventDate: "asc" },
      });
    }

    const tableAssignments = memberships
      .filter((m) => m.role === "MESA_HOST" && m.eventId && m.tableNumber)
      .map((m) => ({
        eventId: m.eventId!,
        tableNumber: m.tableNumber!,
        membershipId: m.id,
      }));

    const venueIds = Array.from(
      new Set(memberships.filter((m) => m.venueId).map((m) => m.venueId!))
    );
    const venues =
      venueIds.length > 0
        ? await prisma.venue.findMany({
            where: { id: { in: venueIds } },
            select: { id: true, name: true, address: true, city: true },
          })
        : [];

    return NextResponse.json({
      success: true,
      data: {
        memberships,
        staffRoles: user.staffRoles ?? memberships.map((m) => m.role),
        events,
        venues,
        tableAssignments,
      },
    });
  } catch (error) {
    console.error("GET staff/my-assignments error:", error);
    return NextResponse.json({ error: "Error al obtener asignaciones" }, { status: 500 });
  }
}
