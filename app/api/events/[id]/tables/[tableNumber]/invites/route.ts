import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

const TOTAL_TABLES = 162; // 9 filas × 18 columnas
const INVITE_EXPIRY_DAYS = 7;

function generateInviteToken(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8);
}

/**
 * POST /api/events/[id]/tables/[tableNumber]/invites
 * Crear invitaciones para una mesa (pago por asiento)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; tableNumber: string } }
) {
  try {
    const { id: eventId, tableNumber: tableNumberStr } = params;
    const tableNumber = parseInt(tableNumberStr, 10);

    if (isNaN(tableNumber) || tableNumber < 1 || tableNumber > TOTAL_TABLES) {
      return NextResponse.json(
        { error: `Número de mesa inválido. Debe estar entre 1 y ${TOTAL_TABLES}` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { invites } = body as { invites?: Array<{ name: string; email?: string; phone?: string }> };

    if (!invites || !Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un arreglo de invites con al menos un invitado (name, email?, phone?)" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const tableTicketType = event.ticketTypes.find((tt) => tt.isTable === true);
    if (!tableTicketType) {
      return NextResponse.json(
        { error: "Este evento no tiene mesas VIP configuradas" },
        { status: 404 }
      );
    }

    const seatsPerTable = tableTicketType.seatsPerTable ?? 4;
    if (invites.length > seatsPerTable) {
      return NextResponse.json(
        { error: `Esta mesa tiene ${seatsPerTable} asientos. Máximo ${seatsPerTable} invitados.` },
        { status: 400 }
      );
    }

    // Validar que la mesa esté disponible (no vendida ni reservada)
    const existingTickets = await prisma.ticket.count({
      where: {
        ticketTypeId: tableTicketType.id,
        tableNumber: `Mesa ${tableNumber}`,
        status: { in: ["VALID", "USED"] },
        sale: { status: "COMPLETED" },
      },
    });

    if (existingTickets > 0) {
      return NextResponse.json(
        { error: `La mesa ${tableNumber} ya está vendida` },
        { status: 400 }
      );
    }

    const existingInvites = await prisma.tableSlotInvite.count({
      where: {
        eventId,
        tableNumber,
        status: { in: ["PENDING", "PAID"] },
      },
    });

    if (existingInvites > 0) {
      return NextResponse.json(
        { error: `La mesa ${tableNumber} ya tiene invitaciones activas. No se pueden crear más.` },
        { status: 400 }
      );
    }

    const priceMesa = Number(tableTicketType.price);
    const pricePerSeat = Math.round((priceMesa / seatsPerTable) * 100) / 100;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const createdInvites = [];

    for (let i = 0; i < invites.length; i++) {
      const inv = invites[i];
      if (!inv || typeof inv.name !== "string" || !inv.name.trim()) {
        return NextResponse.json(
          { error: `Invitado ${i + 1}: el nombre es requerido` },
          { status: 400 }
        );
      }

      let token = generateInviteToken();
      let exists = await prisma.tableSlotInvite.findUnique({ where: { inviteToken: token } });
      while (exists) {
        token = generateInviteToken();
        exists = await prisma.tableSlotInvite.findUnique({ where: { inviteToken: token } });
      }

      const invite = await prisma.tableSlotInvite.create({
        data: {
          eventId,
          ticketTypeId: tableTicketType.id,
          tableNumber,
          seatNumber: i + 1,
          inviteToken: token,
          invitedName: inv.name.trim(),
          invitedEmail: inv.email?.trim() || null,
          invitedPhone: inv.phone?.trim() || null,
          pricePerSeat,
          expiresAt,
        },
      });

      const url = `${baseUrl}/eventos/${eventId}/mesa/${tableNumber}/pagar/${token}`;

      createdInvites.push({
        id: invite.id,
        token: invite.inviteToken,
        name: invite.invitedName,
        seatNumber: invite.seatNumber,
        url,
        pricePerSeat: Number(invite.pricePerSeat),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        invites: createdInvites,
        tableNumber,
        eventName: event.name,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Invites API] Error:", error);
    return NextResponse.json(
      { error: "Error al crear invitaciones" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/[id]/tables/[tableNumber]/invites
 * Listar invites de una mesa (status, nombre, etc.)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; tableNumber: string } }
) {
  try {
    const { id: eventId, tableNumber: tableNumberStr } = params;
    const tableNumber = parseInt(tableNumberStr, 10);

    if (isNaN(tableNumber) || tableNumber < 1 || tableNumber > TOTAL_TABLES) {
      return NextResponse.json({ error: "Número de mesa inválido" }, { status: 400 });
    }

    const invites = await prisma.tableSlotInvite.findMany({
      where: { eventId, tableNumber },
      orderBy: { seatNumber: "asc" },
      include: { event: { select: { name: true } } },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const data = invites.map((inv) => ({
      id: inv.id,
      token: inv.inviteToken,
      name: inv.invitedName,
      seatNumber: inv.seatNumber,
      status: inv.status,
      pricePerSeat: Number(inv.pricePerSeat),
      url: `${baseUrl}/eventos/${eventId}/mesa/${tableNumber}/pagar/${inv.inviteToken}`,
      expiresAt: inv.expiresAt?.toISOString() ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: { invites: data, eventName: invites[0]?.event?.name },
    });
  } catch (error) {
    console.error("[Invites GET] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener invitaciones" },
      { status: 500 }
    );
  }
}
