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
 * GET /api/events/[id]/payment-links
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
    if (!(await userOwnsEvent(user, eventId))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const links = await prisma.paymentLink.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json({
      success: true,
      data: links.map((l) => ({
        ...l,
        amountCents: l.amountCents,
        url: `${baseUrl}/pagar/${l.token}`,
      })),
    });
  } catch (error) {
    console.error("[payment-links GET]", error);
    return NextResponse.json(
      { error: "Error al listar payment links" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/payment-links
 * { label, ticketTypeId?, quantity, amountCents?, maxUses?, expiresAt? }
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
    if (!(await userOwnsEvent(user, eventId))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const label = body?.label ? String(body.label).trim() : null;
    const ticketTypeId = body?.ticketTypeId
      ? String(body.ticketTypeId)
      : null;
    const quantity = Math.max(1, Math.floor(Number(body?.quantity) || 1));
    const amountCents =
      body?.amountCents != null ? Math.round(Number(body.amountCents)) : null;
    const maxUses =
      body?.maxUses != null ? Math.floor(Number(body.maxUses)) : null;
    const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null;

    if (ticketTypeId) {
      const tt = await prisma.ticketType.findFirst({
        where: { id: ticketTypeId, eventId },
      });
      if (!tt) {
        return NextResponse.json(
          { error: "ticketTypeId no pertenece al evento" },
          { status: 400 }
        );
      }
    }

    if (!ticketTypeId && (amountCents == null || amountCents <= 0)) {
      return NextResponse.json(
        { error: "Indica ticketTypeId o amountCents > 0" },
        { status: 400 }
      );
    }

    const link = await prisma.paymentLink.create({
      data: {
        eventId,
        label,
        ticketTypeId,
        quantity,
        amountCents,
        maxUses,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json(
      {
        success: true,
        data: {
          ...link,
          url: `${baseUrl}/pagar/${link.token}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[payment-links POST]", error);
    return NextResponse.json(
      { error: "Error al crear payment link" },
      { status: 500 }
    );
  }
}
