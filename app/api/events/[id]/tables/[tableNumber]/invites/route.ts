import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";
import { parseTableKeyFromPath, ticketTableLabel } from "@/lib/table-invite";
import {
  listInvitePoolTicketTypes,
  resolveInvitePoolTicket,
  isMesaTicketType,
  tableCupos,
  tablePricePerCupo,
} from "@/lib/ticket-pricing";

const INVITE_EXPIRY_DAYS = 7;
const MAX_TRADITIONAL_SLOTS = 500;
const MAX_MIN_PAID_CONFIRM = 10_000;
const MAX_CUPOS = 500;

function generateInviteToken(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8);
}

function poolPaymentUrl(baseUrl: string, eventId: string, tableKey: string, token: string) {
  return `${baseUrl}/eventos/${eventId}/mesa/${encodeURIComponent(tableKey)}/pagar/${token}`;
}

async function resolveOrCreateMesaTicketType(opts: {
  eventId: string;
  tableNumber: string;
  ticketTypes: Array<{
    id: string;
    name: string;
    kind?: string | null;
    isTable?: boolean | null;
    isActive?: boolean | null;
    isHidden?: boolean | null;
    price: unknown;
    tableCapacity?: number | null;
    pricePhases?: unknown;
  }>;
  requestedId?: string;
  totalTablePrice?: number;
  cupos?: number;
  now: Date;
}): Promise<
  | {
      ok: true;
      ticketTypeId: string;
      tablePrice: number;
      cupos: number;
      unitPrice: number;
      ticketTypeName: string;
    }
  | { ok: false; error: string; status: number }
> {
  const totalRaw = opts.totalTablePrice;
  const cuposRaw = opts.cupos;

  if (
    totalRaw != null &&
    Number.isFinite(totalRaw) &&
    totalRaw > 0 &&
    cuposRaw != null &&
    Number.isFinite(cuposRaw) &&
    cuposRaw >= 1
  ) {
    const cupos = Math.min(MAX_CUPOS, Math.max(1, Math.floor(cuposRaw)));
    const tablePrice = Math.round(Number(totalRaw) * 100) / 100;
    const unitPrice = tablePricePerCupo(tablePrice, cupos);
    if (unitPrice <= 0) {
      return { ok: false, error: "Precio total de mesa inválido", status: 400 };
    }
    const created = await prisma.ticketType.create({
      data: {
        eventId: opts.eventId,
        name: `Mesa ${opts.tableNumber}`,
        description: `Link de mesa · ${cupos} cupos · total $${tablePrice.toLocaleString("es-MX")}`,
        category: "VIP",
        kind: "TABLE",
        isTable: true,
        isHidden: true,
        price: tablePrice,
        tableCapacity: cupos,
        seatsPerTable: cupos,
        maxQuantity: 9999,
        minPurchaseQty: 1,
        maxPurchaseQty: null,
      },
    });
    return {
      ok: true,
      ticketTypeId: created.id,
      tablePrice,
      cupos,
      unitPrice,
      ticketTypeName: created.name,
    };
  }

  const listed = listInvitePoolTicketTypes(opts.ticketTypes as any, opts.now);
  const anchor = resolveInvitePoolTicket(
    opts.ticketTypes as any,
    opts.requestedId || undefined,
    opts.now
  );
  if (!anchor) {
    return {
      ok: false,
      error:
        listed.length > 1 && !opts.requestedId
          ? "Elige un tipo de mesa o indica total + cupos."
          : "Indica el total de la mesa y los cupos (ej. mesa de $8,000 / 8 personas).",
      status: 400,
    };
  }
  const mesa = isMesaTicketType(anchor.ticket);
  return {
    ok: true,
    ticketTypeId: String(anchor.ticket.id),
    tablePrice: anchor.tablePrice,
    cupos: mesa ? tableCupos(anchor.ticket.tableCapacity) : 1,
    unitPrice: anchor.unitPrice,
    ticketTypeName: String(anchor.ticket.name || "Mesa"),
  };
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
      cupos: cuposBody,
      mode,
      minPaidToConfirm: minPaidRaw,
      ticketTypeId: ticketTypeIdRaw,
    } = body as {
      invites?: Array<{ name: string; email?: string; phone?: string }>;
      slots?: number;
      totalTablePrice?: number;
      cupos?: number;
      mode?: "pool";
      minPaidToConfirm?: number;
      ticketTypeId?: string;
    };

    const isPoolMode = mode === "pool";

    if (!isPoolMode) {
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
            error: `Envía "slots" (número del 1 al ${MAX_TRADITIONAL_SLOTS}), "invites" (array), o "mode":"pool"`,
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
      include: {
        ticketTypes: {
          include: { pricePhases: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const now = new Date();
    const requestedId = typeof ticketTypeIdRaw === "string" ? ticketTypeIdRaw.trim() : "";
    const resolved = await resolveOrCreateMesaTicketType({
      eventId,
      tableNumber,
      ticketTypes: event.ticketTypes,
      requestedId,
      totalTablePrice:
        totalTablePrice != null ? Number(totalTablePrice) : undefined,
      cupos:
        cuposBody != null
          ? Number(cuposBody)
          : typeof slotsCount === "number"
            ? slotsCount
            : undefined,
      now,
    });
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { ticketTypeId, cupos, unitPrice: pricePerSeat, ticketTypeName } = resolved;
    const mesaTicketLabel = ticketTableLabel(tableNumber);

    const existingTickets = await prisma.ticket.count({
      where: {
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
      const minPaidToConfirm =
        minPaidRaw === undefined || minPaidRaw === null
          ? cupos
          : Math.floor(Number(minPaidRaw));
      if (
        !Number.isFinite(minPaidToConfirm) ||
        minPaidToConfirm < 1 ||
        minPaidToConfirm > MAX_MIN_PAID_CONFIRM
      ) {
        return NextResponse.json(
          { error: `"minPaidToConfirm" debe ser un entero entre 1 y ${MAX_MIN_PAID_CONFIRM}.` },
          { status: 400 }
        );
      }

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
          ticketTypeId,
          tableNumber,
          inviteToken: token,
          maxSlots: null,
          splitAmong: cupos,
          minPaidToConfirm,
          pricePerSeat,
          expiresAt,
        },
      });

      const url = poolPaymentUrl(baseUrl, eventId, tableNumber, token);
      const tableTotal = Math.round(pricePerSeat * cupos * 100) / 100;

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
              tableNumber,
              url,
              pricePerSeat: Number(pool.pricePerSeat),
              tableTotal,
              maxSlots: pool.maxSlots,
              splitAmong: pool.splitAmong,
              minPaidToConfirm: pool.minPaidToConfirm,
              isPool: true,
              ticketTypeName,
              ticketTypeId,
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
          ticketTypeId,
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
