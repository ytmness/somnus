import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/events/[id]/attendance
 * Guestlist pública: { count, people: [{id,name,avatarUrl}] }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.event.findFirst({
      where: { id: params.id, isActive: true },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const [count, people] = await Promise.all([
      prisma.eventAttendance.count({
        where: { eventId: event.id, isPublic: true },
      }),
      prisma.eventAttendance.findMany({
        where: { eventId: event.id, isPublic: true },
        orderBy: { createdAt: "desc" },
        take: 24,
        select: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        count,
        people: people.map((p) => ({
          id: p.user.id,
          name: p.user.name,
          avatarUrl: p.user.avatarUrl,
        })),
      },
    });
  } catch (error) {
    console.error("GET attendance error:", error);
    return NextResponse.json(
      { error: "Error al obtener asistencia" },
      { status: 500 }
    );
  }
}
