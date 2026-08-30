import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageTable } from "@/lib/auth/permissions";
import { ticketTypeInclude } from "@/lib/ticket-type-persist";
import { toInviteTicketPayload, pickTicketsForInviteLink, openInviteTableTickets } from "@/lib/invite-tickets";
import {
  invitePoolMinToConfirm,
  invitePoolPaymentCap,
  invitePoolTableTotal,
  invitePoolSharesLeft,
  invitePoolMesaFilled,
} from "@/lib/ticket-pricing";

function mesaPagarUrl(baseUrl: string, eventId: string, tableKey: string, token: string) {
  return `${baseUrl}/eventos/${eventId}/mesa/${encodeURIComponent(tableKey)}/pagar/${token}`;
}

const eventInviteSelect = {
  id: true,
  name: true,
  eventDate: true,
  eventTime: true,
  venue: true,
  address: true,
  imageUrl: true,
  artist: true,
  salesStartDate: true,
  salesEndDate: true,
} as const;

async function loadInviteTicketTypes(
  eventId: string,
  ticketTypeId?: string | null
) {
  const now = new Date();
  const rows = await prisma.ticketType.findMany({
    where: { eventId, isActive: true },
    include: ticketTypeInclude,
    orderBy: { price: "asc" },
  });
  const includeHidden = Boolean(ticketTypeId);
  return openInviteTableTickets(
    pickTicketsForInviteLink(
      rows
        .map((tt) =>
          toInviteTicketPayload(tt, now, {
            includeHidden: includeHidden && tt.id === ticketTypeId,
          })
        )
        .filter((tt): tt is NonNullable<typeof tt> => Boolean(tt)),
      ticketTypeId
    )
  );
}

/**
 * GET /api/invites/[token]
 * Obtener datos de una invitación por token (para página de pago)
 * Soporta: TableSlotInvite (link por asiento) o TableInvitePool (money pool - un link para toda la mesa)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const resolved = typeof (params as any)?.then === "function" ? await (params as Promise<{ token: string }>) : (params as { token: string });
    const { token } = resolved;

    if (!token) {
      return NextResponse.json({ error: "Token no proporcionado" }, { status: 400 });
    }

    // 1. Buscar en TableSlotInvite (link individual por asiento)
    const invite = await prisma.tableSlotInvite.findUnique({
      where: { inviteToken: token },
      include: {
        event: { select: eventInviteSelect },
      },
    });

    if (invite) {
      // Flujo: TableSlotInvite (link por asiento)
      return handleSlotInvite(invite);
    }

    // 2. Buscar en TableInvitePool (money pool - un link para toda la mesa)
    const pool = await prisma.tableInvitePool.findUnique({
      where: { inviteToken: token },
      include: {
        event: { select: eventInviteSelect },
        ticketType: { select: { id: true, name: true, kind: true, isTable: true, tableCapacity: true } },
        coverTicketType: {
          select: {
            id: true,
            name: true,
            kind: true,
            isTable: true,
            isActive: true,
            isHidden: true,
            price: true,
            maxQuantity: true,
            soldQuantity: true,
            minPurchaseQty: true,
            maxPurchaseQty: true,
            manualSoldOut: true,
            tableCapacity: true,
            salesStartDate: true,
            salesEndDate: true,
            description: true,
            passwordHash: true,
            pricePhases: { orderBy: { sortOrder: "asc" as const } },
          },
        },
      },
    });

    if (!pool) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (pool.expiresAt && new Date() > pool.expiresAt) {
      return NextResponse.json(
        { error: "Este link ha expirado" },
        { status: 400 }
      );
    }

    const isMesaMode = pool.mode === "FULL_TABLE";
    const paidShareCount = await prisma.tableSlotInvite.count({
      where: { poolId: pool.id, status: "PAID", isCover: false },
    });
    const paidCoverCount = await prisma.tableSlotInvite.count({
      where: { poolId: pool.id, status: "PAID", isCover: true },
    });
    const paidCount = paidShareCount + paidCoverCount;
    const minToConfirm = invitePoolMinToConfirm(pool) ?? pool.minPaidToConfirm;

    const paidSlots = await prisma.tableSlotInvite.findMany({
      where: { poolId: pool.id, status: "PAID" },
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
      select: {
        invitedName: true,
        pricePerSeat: true,
        paidAt: true,
        seatNumber: true,
        isCover: true,
      },
    });

    const totalCollected = paidSlots.reduce(
      (sum, s) => sum + Number(s.pricePerSeat),
      0
    );
    const paymentTimeline = paidSlots.map((s, index) => ({
      order: index + 1,
      name: s.invitedName,
      amount: Number(s.pricePerSeat),
      paidAt: s.paidAt?.toISOString() ?? null,
      seatNumber: s.seatNumber,
      isCover: s.isCover,
    }));

    let ticketTypes: any[] = [];
    let coverTicket = null as ReturnType<typeof toInviteTicketPayload> | null;
    let livePrice = Number(pool.pricePerSeat);
    let phase: "collecting" | "cover" = "cover";
    let sharesLeft = 0;
    let mesaFilled = false;
    let tableConfirmed = false;
    let tablePrice: number | null = null;
    let remaining: number | null = null;
    let cupos: number | null = null;

    if (!isMesaMode) {
      // Money pool: entrada sin tope + N pagos para confirmar
      const coverSource = pool.coverTicketType || null;
      coverTicket = coverSource
        ? toInviteTicketPayload(coverSource as any, new Date(), {
            includeHidden: true,
          })
        : null;
      if (!coverTicket) {
        const fallback = await loadInviteTicketTypes(
          pool.eventId,
          pool.coverTicketTypeId || pool.ticketTypeId
        );
        coverTicket = fallback[0] ?? null;
      }
      livePrice = coverTicket?.price ?? Number(pool.pricePerSeat);
      phase = "cover";
      tableConfirmed = paidCount >= minToConfirm;
      ticketTypes = coverTicket
        ? [
            {
              ...coverTicket,
              minPurchaseQty: 1,
              maxPurchaseQty: null,
              maxQuantity: 9999,
              soldQuantity: 0,
            },
          ]
        : [];
    } else {
      sharesLeft = invitePoolSharesLeft(pool, paidShareCount);
      mesaFilled = invitePoolMesaFilled(pool, paidShareCount);
      tableConfirmed = mesaFilled;
      cupos = pool.splitAmong || minToConfirm;
      tablePrice = invitePoolTableTotal(pool);
      const shareCollected = paidSlots
        .filter((s) => !s.isCover)
        .reduce((sum, s) => sum + Number(s.pricePerSeat), 0);
      remaining = Math.max(
        0,
        Math.round((tablePrice - shareCollected) * 100) / 100
      );

      if (pool.coverTicketType) {
        coverTicket = toInviteTicketPayload(pool.coverTicketType as any, new Date(), {
          includeHidden: true,
        });
      }

      if (mesaFilled && coverTicket) {
        phase = "cover";
        livePrice = coverTicket.price;
        ticketTypes = [
          {
            ...coverTicket,
            minPurchaseQty: 1,
            maxPurchaseQty: null,
            maxQuantity: 9999,
            soldQuantity: 0,
          },
        ];
      } else {
        phase = "collecting";
        livePrice = Number(pool.pricePerSeat);
        const ticketTypesRaw = await loadInviteTicketTypes(
          pool.eventId,
          pool.ticketTypeId
        );
        ticketTypes = openInviteTableTickets(
          ticketTypesRaw.map((tt) => {
            if (tt.kind === "TABLE" && tt.tablePrice != null && tt.cupos != null) {
              return {
                ...tt,
                price: livePrice,
                tablePrice,
                cupos,
                maxPurchaseQty: sharesLeft > 0 ? sharesLeft : tt.maxPurchaseQty,
              };
            }
            return {
              ...tt,
              kind: "TABLE" as const,
              price: livePrice,
              tablePrice,
              cupos,
              minPurchaseQty: 1,
              maxPurchaseQty: sharesLeft > 0 ? sharesLeft : null,
            };
          })
        );
        if (ticketTypes.length === 0) {
          ticketTypes = [
            {
              id: pool.ticketTypeId,
              name: pool.ticketType?.name || `Mesa ${pool.tableNumber}`,
              description: null,
              kind: "TABLE" as const,
              price: livePrice,
              tablePrice,
              cupos,
              maxQuantity: 9999,
              soldQuantity: paidShareCount,
              minPurchaseQty: 1,
              maxPurchaseQty: sharesLeft > 0 ? sharesLeft : null,
              manualSoldOut: sharesLeft <= 0,
              salesStartDate: null,
              salesEndDate: null,
            },
          ];
        }
      }
    }

    const paymentCap = invitePoolPaymentCap(pool);
    const poolFull =
      isMesaMode &&
      !pool.coverTicketTypeId &&
      paymentCap != null &&
      paidShareCount >= paymentCap;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const payUrl = mesaPagarUrl(baseUrl, pool.eventId, pool.tableNumber, token);

    const sessionUser = await getSession();
    const canViewPoolFinancials = await canManageTable(
      sessionUser,
      pool.eventId,
      pool.tableNumber
    );

    return NextResponse.json({
      success: true,
      data: {
        id: pool.id,
        token: pool.inviteToken,
        isPool: true,
        poolMode: isMesaMode ? "FULL_TABLE" : "MONEY_POOL",
        tableNumber: pool.tableNumber,
        seatNumber: null,
        pricePerSeat: livePrice,
        tablePrice,
        remaining,
        ticketTypeName: pool.ticketType?.name ?? coverTicket?.name ?? null,
        coverTicketTypeId: pool.coverTicketTypeId,
        coverTicketName: coverTicket?.name ?? null,
        coverTicket,
        phase,
        maxSlots: isMesaMode ? invitePoolPaymentCap(pool) : null,
        cupos,
        splitAmong: cupos ?? pool.splitAmong,
        sharesLeft: isMesaMode ? sharesLeft : null,
        mesaFilled: isMesaMode ? mesaFilled : false,
        minPaidToConfirm: isMesaMode ? cupos : minToConfirm,
        paidCount: isMesaMode ? paidShareCount : paidCount,
        paidCoverCount,
        canViewPoolFinancials,
        ...(canViewPoolFinancials
          ? { totalCollected, paymentTimeline }
          : {
              paymentTimeline: paymentTimeline.map(
                ({ amount: _amount, ...entry }) => entry
              ),
            }),
        tableConfirmed,
        expiresAt: pool.expiresAt?.toISOString() ?? null,
        eventId: pool.eventId,
        event: pool.event,
        ticketTypes,
        payUrl,
        status: poolFull ? "PAID" : "PENDING",
        tableReserved: poolFull,
      },
    });
  } catch (error) {
    console.error("[Invites token GET] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener invitación" },
      { status: 500 }
    );
  }
}

async function handleSlotInvite(invite: any) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const payUrl = mesaPagarUrl(baseUrl, invite.eventId, invite.tableNumber, invite.inviteToken);

  if (invite.expiresAt && new Date() > invite.expiresAt && invite.status === "PENDING") {
      await prisma.tableSlotInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Esta invitación ha expirado" },
        { status: 400 }
      );
    }

    if (invite.status === "EXPIRED") {
      return NextResponse.json(
        { error: "Esta invitación ha expirado" },
        { status: 400 }
      );
    }

    // Si ya está pagada: devolver datos para mostrar "Mesa reservada"
    if (invite.status === "PAID") {
      const sameTableCount = await prisma.tableSlotInvite.count({
        where: {
          eventId: invite.eventId,
          tableNumber: invite.tableNumber,
        },
      });
      const paidCount = await prisma.tableSlotInvite.count({
        where: {
          eventId: invite.eventId,
          tableNumber: invite.tableNumber,
          status: "PAID",
        },
      });
      const tableReserved = paidCount === sameTableCount && sameTableCount > 0;

      return NextResponse.json({
        success: true,
        data: {
          id: invite.id,
          token: invite.inviteToken,
          invitedName: invite.invitedName,
          invitedEmail: invite.invitedEmail,
          invitedPhone: invite.invitedPhone,
          tableNumber: invite.tableNumber,
          seatNumber: invite.seatNumber,
          pricePerSeat: Number(invite.pricePerSeat),
          eventId: invite.eventId,
          event: invite.event,
          payUrl,
          status: "PAID",
          tableReserved,
          paidCount,
          totalSlots: sameTableCount,
        },
      });
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { error: "Esta invitación no está disponible" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invite.id,
        token: invite.inviteToken,
        invitedName: invite.invitedName,
        invitedEmail: invite.invitedEmail,
        invitedPhone: invite.invitedPhone,
        tableNumber: invite.tableNumber,
        seatNumber: invite.seatNumber,
        pricePerSeat: Number(invite.pricePerSeat),
        eventId: invite.eventId,
        event: invite.event,
        payUrl,
      },
    });
}
