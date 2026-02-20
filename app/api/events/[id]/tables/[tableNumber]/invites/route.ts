import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

const TOTAL_TABLES = 162; // 9 filas × 18 columnas
const INVITE_EXPIRY_DAYS = 7;
const MAX_SLOTS_PER_TABLE = 100; // Límite al generar el link grupal (lo establece el admin)

function generateInviteToken(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8);
}

/**
 * POST /api/events/[id]/tables/[tableNumber]/invites
 * Crear invitaciones para una mesa (pago por asiento)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableNumber: string }> | { id: string; tableNumber: string } }
) {
  try {
    const resolvedParams = typeof (params as any)?.then === "function" ? await (params as Promise<{ id: string; tableNumber: string }>) : (params as { id: string; tableNumber: string });
    const { id: eventId, tableNumber: tableNumberStr } = resolvedParams;
    const tableNumber = parseInt(tableNumberStr, 10);

    if (isNaN(tableNumber) || tableNumber < 1 || tableNumber > TOTAL_TABLES) {
      return NextResponse.json(
        { error: `Número de mesa inválido. Debe estar entre 1 y ${TOTAL_TABLES}` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { invites: invitesList, slots: slotsCount, totalTablePrice } = body as {
      invites?: Array<{ name: string; email?: string; phone?: string }>;
      slots?: number;
      totalTablePrice?: number;
    };

    // Aceptar "slots" (1 a MAX): cada quien pone sus datos al pagar. O "invites" con nombres opcionales.
    let invites: Array<{ name: string; email?: string; phone?: string }>;
    if (typeof slotsCount === "number" && slotsCount >= 1 && slotsCount <= MAX_SLOTS_PER_TABLE) {
      invites = Array.from({ length: slotsCount }, () => ({ name: "Pendiente" }));
    } else if (invitesList && Array.isArray(invitesList) && invitesList.length > 0) {
      invites = invitesList.map((inv) => ({
        name: inv?.name?.trim() ? inv.name.trim() : "Pendiente",
        email: inv?.email?.trim() || undefined,
        phone: inv?.phone?.trim() || undefined,
      }));
    } else {
      return NextResponse.json(
        { error: `Envía "slots" (número del 1 al ${MAX_SLOTS_PER_TABLE}) o "invites" (array con al menos un item)` },
        { status: 400 }
      );
    }

    if (invites.length > MAX_SLOTS_PER_TABLE) {
      return NextResponse.json(
        { error: `Máximo ${MAX_SLOTS_PER_TABLE} personas por mesa` },
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
        { error: "Este evento no tiene mesas VIP configuradas. Edita el evento y agrega un tipo de boleto con opción Mesa VIP." },
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

    // Precio por asiento: si envían totalTablePrice se divide entre slots; si no, se usa el del tipo de boleto
    let pricePerSeat: number;
    if (typeof totalTablePrice === "number" && totalTablePrice > 0) {
      pricePerSeat = Math.round((totalTablePrice / invites.length) * 100) / 100;
      if (pricePerSeat <= 0) {
        return NextResponse.json(
          { error: "El precio total debe ser mayor que 0" },
          { status: 400 }
        );
      }
    } else {
      const seatsPerTable = tableTicketType.seatsPerTable ?? 4;
      const priceMesa = Number(tableTicketType.price);
      pricePerSeat = Math.round((priceMesa / seatsPerTable) * 100) / 100;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const createdInvites = [];

    for (let i = 0; i < invites.length; i++) {
      const inv = invites[i];
      const name = (inv?.name?.trim() || "Pendiente").slice(0, 200);

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
          invitedName: name,
          invitedEmail: inv?.email?.trim() || null,
          invitedPhone: inv?.phone?.trim() || null,
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tableNumber: string }> | { id: string; tableNumber: string } }
) {
  try {
    const resolvedParams = typeof (params as any)?.then === "function" ? await (params as Promise<{ id: string; tableNumber: string }>) : (params as { id: string; tableNumber: string });
    const { id: eventId, tableNumber: tableNumberStr } = resolvedParams;
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
