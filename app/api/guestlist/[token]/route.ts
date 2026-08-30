import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { generateQRHash } from "@/lib/services/qr-generator";

export const dynamic = "force-dynamic";

async function resolveToken(
  params: Promise<{ token: string }> | { token: string }
): Promise<string> {
  const resolved =
    typeof (params as Promise<{ token: string }>)?.then === "function"
      ? await (params as Promise<{ token: string }>)
      : (params as { token: string });
  return resolved.token;
}

/**
 * GET /api/guestlist/[token]
 * Datos públicos de una cortesía
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const token = await resolveToken(params);
    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const entry = await prisma.guestListEntry.findUnique({
      where: { inviteToken: token },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            artist: true,
            eventDate: true,
            eventTime: true,
            venue: true,
            address: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
        quantity: entry.quantity,
        note: entry.note,
        status: entry.status,
        redeemedAt: entry.redeemedAt,
        event: entry.event,
        canRedeem: entry.status === "PENDING" || entry.status === "CONFIRMED",
      },
    });
  } catch (error) {
    console.error("[guestlist token GET]", error);
    return NextResponse.json(
      { error: "Error al obtener guest list" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/guestlist/[token]
 * Redeem: crea Sale COMPLETED gratis + Tickets con QR, o solo CONFIRMED
 * Body: { mode?: "tickets" | "confirm", buyerName?, buyerEmail?, buyerPhone? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const token = await resolveToken(params);
    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const entry = await prisma.guestListEntry.findUnique({
      where: { inviteToken: token },
      include: {
        event: { select: { id: true, name: true } },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (entry.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Esta cortesía fue cancelada" },
        { status: 400 }
      );
    }

    if (entry.status === "USED" || entry.redeemedAt) {
      return NextResponse.json(
        { error: "Esta cortesía ya fue canjeada" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const mode = body?.mode === "confirm" ? "confirm" : "tickets";
    const buyerName =
      String(body?.buyerName || "").trim() || entry.name;
    const buyerEmail =
      String(body?.buyerEmail || "").trim().toLowerCase() ||
      entry.email ||
      `guestlist+${entry.id.slice(0, 8)}@somnus.local`;
    const buyerPhone =
      String(body?.buyerPhone || "").trim() || entry.phone || null;

    if (mode === "confirm") {
      const updated = await prisma.guestListEntry.update({
        where: { id: entry.id },
        data: { status: "CONFIRMED" },
      });
      return NextResponse.json({
        success: true,
        message: "Cortesía confirmada",
        data: { entry: updated, tickets: [] },
      });
    }

    const ticketType = await prisma.ticketType.findFirst({
      where: {
        eventId: entry.eventId,
        isActive: true,
        kind: "STANDARD",
        isTable: false,
      },
      orderBy: { price: "asc" },
    });

    if (!ticketType) {
      return NextResponse.json(
        {
          error:
            "No hay tipo de boleto STANDARD para emitir cortesías. Confirma sin tickets o crea uno.",
        },
        { status: 400 }
      );
    }

    const qty = Math.max(1, entry.quantity);
    const eventPrefix = (entry.event.name || "EVT").substring(0, 3).toUpperCase();
    const typePrefix = (ticketType.name || "GL").substring(0, 3).toUpperCase();

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          eventId: entry.eventId,
          channel: "ONLINE",
          status: "COMPLETED",
          subtotal: 0,
          tax: 0,
          total: 0,
          buyerName,
          buyerEmail,
          buyerPhone,
          paymentMethod: "guestlist",
          paidAt: new Date(),
          currency: "MXN",
        },
      });

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          ticketTypeId: ticketType.id,
          quantity: qty,
          isTable: false,
        },
      });

      const tickets = [];
      for (let i = 0; i < qty; i++) {
        const ticketCount = await tx.ticket.count({
          where: { ticketTypeId: ticketType.id },
        });
        const seq = String(ticketCount + 1).padStart(6, "0");
        const uniqueSuffix = crypto.randomBytes(3).toString("hex");
        const ticketNumber = `${eventPrefix}-${typePrefix}-${seq}-${uniqueSuffix}`;
        const tempQr = `tmp-${crypto.randomUUID()}`;

        const ticket = await tx.ticket.create({
          data: {
            saleId: sale.id,
            ticketTypeId: ticketType.id,
            ticketNumber,
            qrCode: tempQr,
          },
        });

        const qrHash = generateQRHash(ticket.id);
        const updated = await tx.ticket.update({
          where: { id: ticket.id },
          data: { qrCode: qrHash },
        });
        tickets.push(updated);
      }

      const updatedEntry = await tx.guestListEntry.update({
        where: { id: entry.id },
        data: {
          status: "USED",
          redeemedAt: new Date(),
        },
      });

      return { sale, tickets, entry: updatedEntry };
    });

    return NextResponse.json({
      success: true,
      message: "Cortesía canjeada",
      data: {
        saleId: result.sale.id,
        entry: result.entry,
        tickets: result.tickets.map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          qrCode: t.qrCode,
        })),
      },
    });
  } catch (error) {
    console.error("[guestlist token POST]", error);
    return NextResponse.json(
      { error: "Error al canjear cortesía" },
      { status: 500 }
    );
  }
}
