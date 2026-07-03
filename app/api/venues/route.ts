import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { getOrganizerForUser } from "@/lib/auth/event-access";
import { ensureOrganizerProfile } from "@/lib/auth/event-access";

export const dynamic = "force-dynamic";

/**
 * GET /api/venues
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizerIdParam = searchParams.get("organizerId");

    if (user.role === "ADMIN") {
      const venues = await prisma.venue.findMany({
        where: organizerIdParam ? { organizerId: organizerIdParam } : undefined,
        include: {
          organizer: { select: { id: true, businessName: true } },
          _count: { select: { events: true } },
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ success: true, data: venues });
    }

    const organizer = await getOrganizerForUser(user.id);
    if (!organizer) {
      return NextResponse.json({ success: true, data: [] });
    }

    const venues = await prisma.venue.findMany({
      where: { organizerId: organizer.id },
      include: { _count: { select: { events: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: venues });
  } catch (error) {
    console.error("GET venues error:", error);
    return NextResponse.json({ error: "Error al obtener venues" }, { status: 500 });
  }
}

/**
 * POST /api/venues
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN", "ORGANIZER"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, city, capacity } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    let organizerId = body.organizerId;
    if (user!.role === "ORGANIZER") {
      const organizer = await ensureOrganizerProfile(user!);
      organizerId = organizer.id;
    }

    if (!organizerId) {
      return NextResponse.json({ error: "organizerId requerido" }, { status: 400 });
    }

    const venue = await prisma.venue.create({
      data: {
        organizerId,
        name: name.trim(),
        address: address?.trim() || null,
        city: city?.trim() || null,
        capacity: capacity ? Number(capacity) : null,
      },
    });

    return NextResponse.json({ success: true, data: venue }, { status: 201 });
  } catch (error) {
    console.error("POST venues error:", error);
    return NextResponse.json({ error: "Error al crear venue" }, { status: 500 });
  }
}

/**
 * PATCH /api/venues
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, address, city, capacity, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    const venue = await prisma.venue.findUnique({
      where: { id },
      select: { organizer: { select: { userId: true } } },
    });

    if (!venue) {
      return NextResponse.json({ error: "Venue no encontrado" }, { status: 404 });
    }

    if (user.role !== "ADMIN" && venue.organizer.userId !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const updated = await prisma.venue.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(capacity !== undefined && { capacity: capacity ? Number(capacity) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH venues error:", error);
    return NextResponse.json({ error: "Error al actualizar venue" }, { status: 500 });
  }
}
