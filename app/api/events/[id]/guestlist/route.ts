import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { userOwnsEvent } from "@/lib/auth/event-access";

export const dynamic = "force-dynamic";

async function resolveId(
  params: Promise<{ id: string }> | { id: string }
): Promise<string> {
  const resolved =
    typeof (params as Promise<{ id: string }>)?.then === "function"
      ? await (params as Promise<{ id: string }>)
      : (params as { id: string });
  return resolved.id;
}

/**
 * GET /api/events/[id]/guestlist
 * Lista entradas de guest list (organizador / admin)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const eventId = await resolveId(params);
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const owns = await userOwnsEvent(user, eventId);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const entries = await prisma.guestListEntry.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json({
      success: true,
      data: entries.map((e) => ({
        ...e,
        redeemUrl: `${baseUrl}/guestlist/${e.inviteToken}`,
      })),
    });
  } catch (error) {
    console.error("[guestlist GET]", error);
    return NextResponse.json(
      { error: "Error al listar guest list" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/guestlist
 * Crear entrada de cortesía
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const eventId = await resolveId(params);
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const owns = await userOwnsEvent(user, eventId);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const name = String(body?.name || "").trim();
    const email = body?.email ? String(body.email).trim().toLowerCase() : null;
    const phone = body?.phone ? String(body.phone).trim() : null;
    const note = body?.note ? String(body.note).trim() : null;
    const quantity = Math.max(1, Math.floor(Number(body?.quantity) || 1));

    if (!name) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const entry = await prisma.guestListEntry.create({
      data: {
        eventId,
        name,
        email,
        phone,
        note,
        quantity,
        createdById: user.id,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json(
      {
        success: true,
        data: {
          ...entry,
          redeemUrl: `${baseUrl}/guestlist/${entry.inviteToken}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[guestlist POST]", error);
    return NextResponse.json(
      { error: "Error al crear entrada" },
      { status: 500 }
    );
  }
}
