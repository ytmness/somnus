import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";
import { parseTableKeyFromPath, ticketTableLabel } from "@/lib/table-invite";

const INVITE_EXPIRY_DAYS = 7;
const MAX_TRADITIONAL_SLOTS = 500;
const DEFAULT_MIN_PAID_TO_CONFIRM = 20;
const MAX_SPLIT_AMONG = 10_000;

function generateInviteToken(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8);
}

function poolPaymentUrl(baseUrl: string, eventId: string, tableKey: string, token: string) {
  return `${baseUrl}/eventos/${eventId}/mesa/${encodeURIComponent(tableKey)}/pagar/${token}`;
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
    const resolvedParams =
      typeof (params as any)?.then === "function"
        ? await (params as Promise<{ id: string; tableNumber: string }>)
        : (params as { id: string; tableNumber: string });
    const { id: eventId, tableNumber: tableNumberRaw } = resolvedParams;
    const tableNumber = parseTableKeyFromPath(tableNumberRaw);

    if (!tableNumber) {
      return NextResponse.json(
        { error: "Nombre o número de mesa inválido (1–120 caracteres)." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      invites: invitesList,
      slots: slotsCount,
      totalTablePrice,
      mode,
      splitAmong: splitAmongRaw,
      minPaidToConfirm: minPaidRaw,
    } = body as {
      invites?: Array<{ name: string; email?: string; phone?: string }>;
      slots?: number;
      totalTablePrice?: number;
      mode?: "pool";
      splitAmong?: number;
      minPaidToConfirm?: number;
    };

    const isPoolMode = mode === "pool";

    if (isPoolMode) {
      const splitAmong = Math.floor(Number(splitAmongRaw));
      const totalPrice = parseFloat(String(totalTablePrice ?? "").replace(/,/g, "."));
      if (
        !Number.isFinite(splitAmong) ||
        splitAmong < 1 ||
        splitAmong > MAX_SPLIT_AMONG ||
        !Number.isFinite(totalPrice) ||
        totalPrice <= 0
      ) {
        return NextResponse.json(
          {
            error: `Modo pool requiere "totalTablePrice" mayor a 0 y "splitAmong" (entre cuántas personas se divide el precio, 1–${MAX_SPLIT_AMONG}).`,
          },
          { status: 400 }
        );
      }
      const minPaid =
        minPaidRaw === undefined || minPaidRaw === null
          ? DEFAULT_MIN_PAID_TO_CONFIRM
          : Math.floor(Number(minPaidRaw));
      if (!Number.isFinite(minPaid) || minPaid < 1 || minPaid > MAX_SPLIT_AMONG) {
        return NextResponse.json(
          { error: `"minPaidToConfirm" debe ser un entero entre 1 y ${MAX_SPLIT_AMONG}.` },
          { status: 400 }
        );
      }
    } else {
      let invites: Array<{ name: string; email?: string; phone?: string }>;
      if (typeof slotsCount === "number" && slotsCount >= 1 && slotsCount <= MAX_TRADITIONAL_SLOTS) {
        invites = Array.from({ length: slotsCount }, () => ({ name: "Pendiente" }));
      } else if (invitesList && Array.isArray(invitesList) && invitesList.length > 0) {
        invites = invitesList.map((inv) => ({
          name: inv?.name?.trim() ? inv.name.trim() : "Pendiente",
          email: inv?.email?.trim() || undefined,
          phone: inv?.phone?.trim() || undefined,
        }));
      } else {
        return NextResponse.json(
          {
            error: `Envía "slots" (número del 1 al ${MAX_TRADITIONAL_SLOTS}), "invites" (array), o "mode":"pool" con totalTablePrice y splitAmong`,
          },
          { status: 400 }
        );
      }
      if (invites.length > MAX_TRADITIONAL_SLOTS) {
        return NextResponse.json(
          { error: `Máximo ${MAX_TRADITIONAL_SLOTS} personas por mesa` },
          { status: 400 }
        );
      }
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
        {
          error:
            "Este evento no tiene mesas VIP configuradas. Edita el evento y agrega un tipo de boleto con opción Mesa VIP.",
        },
        { status: 400 }
      );
    }

    const mesaTicketLabel = ticketTableLabel(tableNumber);

    const existingTickets = await prisma.ticket.count({
      where: {
        ticketTypeId: tableTicketType.id,
        tableNumber: mesaTicketLabel,
        status: { in: ["VALID", "USED"] },
        sale: { status: "COMPLETED" },
      },
    });

    if (existingTickets > 0) {
      return NextResponse.json(
        { error: `La mesa "${tableNumber}" ya está vendida` },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    if (isPoolMode) {
      const splitAmong = Math.floor(Number(splitAmongRaw));
      const minPaidToConfirm =
        minPaidRaw === undefined || minPaidRaw === null
          ? DEFAULT_MIN_PAID_TO_CONFIRM
          : Math.floor(Number(minPaidRaw));
      const totalPrice = parseFloat(String(totalTablePrice).replace(/,/g, "."));
      if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
        return NextResponse.json({ error: "Precio total de la mesa debe ser mayor a 0" }, { status: 400 });
      }
      const pricePerSeat = Math.round((totalPrice / splitAmong) * 100) / 100;

      const existingPool = await prisma.tableInvitePool.findFirst({
        where: { eventId, tableNumber },
      });
      if (existingPool) {
        return NextResponse.json(
          { error: `La mesa "${tableNumber}" ya tiene un link compartido activo.` },
          { status: 400 }
        );
      }
      const existingInvites = await prisma.tableSlotInvite.count({
        where: { eventId, tableNumber, status: { in: ["PENDING", "PAID"] } },
      });
      if (existingInvites > 0) {
        return NextResponse.json(
          { error: `La mesa "${tableNumber}" ya tiene invitaciones. No se pueden crear más.` },
          { status: 400 }
        );
      }

      let token = generateInviteToken();
      let exists =
        (await prisma.tableSlotInvite.findUnique({ where: { inviteToken: token } })) ||
        (await prisma.tableInvitePool.findUnique({ where: { inviteToken: token } }));
      while (exists) {
        token = generateInviteToken();
        exists =
          (await prisma.tableSlotInvite.findUnique({ where: { inviteToken: token } })) ||
          (await prisma.tableInvitePool.findUnique({ where: { inviteToken: token } }));
      }

      const pool = await prisma.tableInvitePool.create({
        data: {
          eventId,
          ticketTypeId: tableTicketType.id,
          tableNumber,
          inviteToken: token,
          maxSlots: null,
          splitAmong,
          minPaidToConfirm,
          pricePerSeat,
          expiresAt,
        },
      });

      const url = poolPaymentUrl(baseUrl, eventId, tableNumber, token);

      return NextResponse.json({
        success: true,
        data: {
          isPool: true,
          invites: [
            {
              id: pool.id,
              token: pool.inviteToken,
              name: "Mesa compartida",
              seatNumber: null,
              url,
              pricePerSeat: Number(pool.pricePerSeat),
              maxSlots: pool.maxSlots,
              splitAmong: pool.splitAmong,
              minPaidToConfirm: pool.minPaidToConfirm,
              isPool: true,
            },
          ],
          tableNumber,
          eventName: event.name,
          expiresAt: expiresAt.toISOString(),
        },
      });
    }

    let invites: Array<{ name: string; email?: string; phone?: string }>;
    if (typeof slotsCount === "number" && slotsCount >= 1 && slotsCount <= MAX_TRADITIONAL_SLOTS) {
      invites = Array.from({ length: slotsCount }, () => ({ name: "Pendiente" }));
    } else if (invitesList && Array.isArray(invitesList) && invitesList.length > 0) {
      invites = invitesList.map((inv) => ({
        name: inv?.name?.trim() ? inv.name.trim() : "Pendiente",
        email: inv?.email?.trim() || undefined,
        phone: inv?.phone?.trim() || undefined,
      }));
    } else {
      return NextResponse.json({ error: `Envía "slots" o "invites"` }, { status: 400 });
    }

    const existingInvitesCount = await prisma.tableSlotInvite.count({
      where: { eventId, tableNumber, status: { in: ["PENDING", "PAID"] } },
    });
    if (existingInvitesCount > 0) {
      return NextResponse.json(
        { error: `La mesa "${tableNumber}" ya tiene invitaciones activas.` },
        { status: 400 }
      );
    }
    const existingPoolCheck = await prisma.tableInvitePool.findFirst({
      where: { eventId, tableNumber },
    });
    if (existingPoolCheck) {
      return NextResponse.json(
        {
          error: `La mesa "${tableNumber}" ya tiene un link compartido. No se pueden crear links individuales.`,
        },
        { status: 400 }
      );
    }

    let pricePerSeat: number;
    if (typeof totalTablePrice === "number" && totalTablePrice > 0) {
      pricePerSeat = Math.round((totalTablePrice / invites.length) * 100) / 100;
      if (pricePerSeat <= 0) {
        return NextResponse.json({ error: "El precio total debe ser mayor que 0" }, { status: 400 });
      }
    } else {
      const seatsPerTable = tableTicketType.seatsPerTable ?? 4;
      const priceMesa = Number(tableTicketType.price);
      pricePerSeat = Math.round((priceMesa / seatsPerTable) * 100) / 100;
    }

    const createdInvites = [];
    for (let i = 0; i < invites.length; i++) {
      const inv = invites[i];
      const name = (inv?.name?.trim() || "Pendiente").slice(0, 200);

      let token = generateInviteToken();
      let exists =
        (await prisma.tableSlotInvite.findUnique({ where: { inviteToken: token } })) ||
        (await prisma.tableInvitePool.findUnique({ where: { inviteToken: token } }));
      while (exists) {
        token = generateInviteToken();
        exists =
          (await prisma.tableSlotInvite.findUnique({ where: { inviteToken: token } })) ||
          (await prisma.tableInvitePool.findUnique({ where: { inviteToken: token } }));
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

      const url = poolPaymentUrl(baseUrl, eventId, tableNumber, token);
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
    return NextResponse.json({ error: "Error al crear invitaciones" }, { status: 500 });
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
    const resolvedParams =
      typeof (params as any)?.then === "function"
        ? await (params as Promise<{ id: string; tableNumber: string }>)
        : (params as { id: string; tableNumber: string });
    const { id: eventId, tableNumber: tableNumberRaw } = resolvedParams;
    const tableNumber = parseTableKeyFromPath(tableNumberRaw);

    if (!tableNumber) {
      return NextResponse.json({ error: "Nombre o número de mesa inválido" }, { status: 400 });
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
      url: poolPaymentUrl(baseUrl, eventId, tableNumber, inv.inviteToken),
      expiresAt: inv.expiresAt?.toISOString() ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: { invites: data, eventName: invites[0]?.event?.name },
    });
  } catch (error) {
    console.error("[Invites GET] Error:", error);
    return NextResponse.json({ error: "Error al obtener invitaciones" }, { status: 500 });
  }
}
