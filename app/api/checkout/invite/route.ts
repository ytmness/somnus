import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { calculateSaleAmounts } from "@/lib/payments/commissions";
import { isStripeEnabled } from "@/lib/payments/config";
import { ticketTableLabel } from "@/lib/table-invite";
import { ticketTypeInclude } from "@/lib/ticket-type-persist";
import {
  canBuyInviteTicket,
  pickTicketsForInviteLink,
  openInviteTableTickets,
  toInviteTicketPayload,
} from "@/lib/invite-tickets";
import {
  invitePoolPaymentCap,
  invitePoolSharesLeft,
  invitePoolMesaFilled,
} from "@/lib/ticket-pricing";
import type { Prisma } from "@prisma/client";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type InviteLoaded = Prisma.TableSlotInviteGetPayload<{
  include: { event: true; ticketType: true };
}>;

type InviteLine = {
  ticketTypeId: string;
  quantity: number;
  unitPrice: number;
};

function generateInviteToken(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8);
}

async function uniqueInviteToken(): Promise<string> {
  let slotToken = generateInviteToken();
  let exists =
    (await prisma.tableSlotInvite.findUnique({ where: { inviteToken: slotToken } })) ||
    (await prisma.tableInvitePool.findUnique({ where: { inviteToken: slotToken } }));
  while (exists) {
    slotToken = generateInviteToken();
    exists =
      (await prisma.tableSlotInvite.findUnique({ where: { inviteToken: slotToken } })) ||
      (await prisma.tableInvitePool.findUnique({ where: { inviteToken: slotToken } }));
  }
  return slotToken;
}

/**
 * POST /api/checkout/invite
 * Crear una venta desde una invitación de mesa (pago por asiento)
 * Soporta: TableSlotInvite (link individual) o TableInvitePool (money pool)
 */
export async function POST(request: NextRequest) {
  try {
    if (!isStripeEnabled()) {
      return NextResponse.json(
        { error: "El pago con tarjeta no está disponible. Contacta al administrador." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { inviteToken, buyerName, buyerEmail, buyerPhone, extraPeople, items, payMode } = body as {
      inviteToken?: string;
      buyerName?: string;
      buyerEmail?: string;
      buyerPhone?: string;
      extraPeople?: Array<{ name?: string; email?: string; phone?: string }>;
      items?: Array<{ ticketTypeId?: string; quantity?: number }>;
      /** share = cupos a unitPrice; full = toda la mesa de un golpe */
      payMode?: "share" | "full";
    };
    const mode = payMode === "full" ? "full" : "share";

    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para pagar esta invitación", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    if (!inviteToken || !buyerName || !buyerEmail) {
      return NextResponse.json(
        { error: "Se requiere inviteToken, buyerName y buyerEmail" },
        { status: 400 }
      );
    }

    let invite = await prisma.tableSlotInvite.findUnique({
      where: { inviteToken },
      include: { event: true, ticketType: true },
    });

    const extras =
      Array.isArray(extraPeople) && extraPeople.length > 0
        ? extraPeople
            .map((p) => ({
              name: (p?.name ?? "").trim(),
              email: (p?.email ?? "").trim() || undefined,
              phone: (p?.phone ?? "").trim() || undefined,
            }))
            .filter((p) => p.name.length > 0)
        : [];

    let lineItems: InviteLine[] = [];

    if (!invite) {
      const pool = await prisma.tableInvitePool.findUnique({
        where: { inviteToken },
        include: { event: true, ticketType: true, coverTicketType: true },
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

      const paidShareCount = await prisma.tableSlotInvite.count({
        where: { poolId: pool.id, status: "PAID", isCover: false },
      });
      const paidCount = await prisma.tableSlotInvite.count({
        where: { poolId: pool.id, status: "PAID" },
      });
      const isMesaMode = pool.mode === "FULL_TABLE";
      const sharesLeft = invitePoolSharesLeft(pool, paidShareCount);
      const mesaFilled = isMesaMode && invitePoolMesaFilled(pool, paidShareCount);

      const now = new Date();
      const event = await prisma.event.findUnique({
        where: { id: pool.eventId },
        include: { ticketTypes: { include: ticketTypeInclude } },
      });
      if (!event) {
        return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
      }

      const eventWindow = {
        salesStartDate: event.salesStartDate,
        salesEndDate: event.salesEndDate,
      };

      const requestedItems = Array.isArray(items)
        ? items
            .map((it) => ({
              ticketTypeId: String(it?.ticketTypeId || ""),
              quantity: Math.floor(Number(it?.quantity) || 0),
            }))
            .filter((it) => it.ticketTypeId && it.quantity > 0)
        : [];

      let isCoverCheckout = false;

      if (!isMesaMode) {
        // MONEY_POOL: entrada del evento, sin tope
        const coverTypeId = pool.coverTicketTypeId || pool.ticketTypeId;
        const requestedId = requestedItems[0]?.ticketTypeId || "";
        const coverRow =
          event.ticketTypes.find((t) => t.id === coverTypeId) ||
          event.ticketTypes.find((t) => t.id === requestedId);
        let coverPayload = coverRow
          ? toInviteTicketPayload(coverRow, now, { includeHidden: true })
          : null;
        if (!coverPayload) {
          const all = event.ticketTypes
            .map((tt) =>
              toInviteTicketPayload(tt, now, { includeHidden: true })
            )
            .filter(
              (tt): tt is NonNullable<typeof tt> => Boolean(tt)
            );
          coverPayload =
            pickTicketsForInviteLink(all, coverTypeId)[0] ||
            pickTicketsForInviteLink(all, requestedId)[0] ||
            all.find((tt) => tt.kind === "STANDARD") ||
            null;
        }
        if (!coverPayload) {
          return NextResponse.json(
            { error: "La entrada de este money pool ya no está disponible." },
            { status: 400 }
          );
        }
        if (requestedId && requestedId !== coverPayload.id) {
          const requestedRow = event.ticketTypes.find((t) => t.id === requestedId);
          const requestedPayload = requestedRow
            ? toInviteTicketPayload(requestedRow, now, { includeHidden: true })
            : null;
          if (requestedPayload) coverPayload = requestedPayload;
        }

        const qty =
          requestedItems.length > 0
            ? requestedItems.reduce((s, r) => {
                if (r.ticketTypeId !== coverPayload.id) return s;
                return s + r.quantity;
              }, 0)
            : 1 + extras.length;

        if (qty < 1) {
          return NextResponse.json(
            { error: "Selecciona al menos una entrada" },
            { status: 400 }
          );
        }
        if (
          requestedItems.some(
            (r) => r.ticketTypeId && r.ticketTypeId !== coverPayload.id
          )
        ) {
          return NextResponse.json(
            { error: "Este link solo cobra la entrada configurada." },
            { status: 400 }
          );
        }

        const check = canBuyInviteTicket(eventWindow, coverPayload, qty, now);
        if (!check.ok) {
          return NextResponse.json({ error: check.error }, { status: 400 });
        }

        lineItems = [
          {
            ticketTypeId: coverPayload.id,
            quantity: qty,
            unitPrice: coverPayload.price,
          },
        ];
        isCoverCheckout = true;
      } else if (mesaFilled) {
        if (!pool.coverTicketTypeId) {
          return NextResponse.json(
            { error: "Esta mesa ya está completa." },
            { status: 400 }
          );
        }
        if (mode === "full") {
          return NextResponse.json(
            { error: "La mesa ya está llena. Los extras pagan boleto normal." },
            { status: 400 }
          );
        }

        const coverRow = event.ticketTypes.find((t) => t.id === pool.coverTicketTypeId);
        const coverPayload = coverRow
          ? toInviteTicketPayload(coverRow, now)
          : null;
        if (!coverPayload) {
          return NextResponse.json(
            { error: "El boleto normal para extras ya no está disponible." },
            { status: 400 }
          );
        }

        const qty =
          requestedItems.length > 0
            ? requestedItems.reduce((s, r) => {
                if (r.ticketTypeId !== coverPayload.id) return s;
                return s + r.quantity;
              }, 0)
            : 1 + extras.length;

        if (qty < 1) {
          return NextResponse.json(
            { error: "Selecciona cuántos boletos quieres pagar" },
            { status: 400 }
          );
        }
        if (
          requestedItems.some(
            (r) => r.ticketTypeId && r.ticketTypeId !== coverPayload.id
          )
        ) {
          return NextResponse.json(
            { error: "Con la mesa llena solo se cobra el boleto normal." },
            { status: 400 }
          );
        }

        const check = canBuyInviteTicket(eventWindow, coverPayload, qty, now);
        if (!check.ok) {
          return NextResponse.json({ error: check.error }, { status: 400 });
        }

        lineItems = [
          {
            ticketTypeId: coverPayload.id,
            quantity: qty,
            unitPrice: coverPayload.price,
          },
        ];
        isCoverCheckout = true;
      } else {
        // Mesa: cobrar cupos (división) o mesa completa
        const allowed = openInviteTableTickets(
          pickTicketsForInviteLink(
            event.ticketTypes
              .map((tt) =>
                toInviteTicketPayload(tt, now, {
                  includeHidden: tt.id === pool.ticketTypeId,
                })
              )
              .filter((tt): tt is NonNullable<typeof tt> => Boolean(tt)),
            pool.ticketTypeId
          )
        );

        const unit = Number(pool.pricePerSeat);
        const cupos = Math.max(1, Math.floor(Number(pool.splitAmong) || 1));
        const tableTotal = Math.round(unit * cupos * 100) / 100;

        if (mode === "full") {
          if (paidShareCount > 0) {
            return NextResponse.json(
              {
                error:
                  "Ya hay pagos en esta mesa. Elige cupos para pagar tu parte o el resto.",
              },
              { status: 400 }
            );
          }
          const mapped =
            allowed.find((tt) => tt.id === pool.ticketTypeId) ||
            allowed.find((tt) => tt.kind === "TABLE");
          if (!mapped) {
            return NextResponse.json(
              { error: "Tipo de mesa no disponible" },
              { status: 400 }
            );
          }
          for (let i = 0; i < cupos; i++) {
            const isLast = i === cupos - 1;
            const seatUnit =
              isLast && cupos > 1
                ? Math.round((tableTotal - unit * (cupos - 1)) * 100) / 100
                : unit;
            lineItems.push({
              ticketTypeId: pool.ticketTypeId,
              quantity: 1,
              unitPrice: seatUnit > 0 ? seatUnit : unit,
            });
          }
        } else if (requestedItems.length > 0) {
          for (const req of requestedItems) {
            if (req.ticketTypeId !== pool.ticketTypeId) {
              return NextResponse.json(
                { error: "Este link solo cobra cupos de esta mesa." },
                { status: 400 }
              );
            }
            lineItems.push({
              ticketTypeId: pool.ticketTypeId,
              quantity: req.quantity,
              unitPrice: unit,
            });
          }
        } else {
          lineItems = [
            {
              ticketTypeId: pool.ticketTypeId,
              quantity: 1 + extras.length,
              unitPrice: unit,
            },
          ];
        }

        const seatsToCharge = lineItems.reduce((sum, l) => sum + l.quantity, 0);
        if (seatsToCharge < 1) {
          return NextResponse.json(
            { error: "Selecciona al menos un cupo" },
            { status: 400 }
          );
        }
        if (seatsToCharge > sharesLeft) {
          return NextResponse.json(
            {
              error:
                sharesLeft <= 0
                  ? "La mesa ya está cubierta. Los siguientes pagan boleto normal."
                  : `Solo quedan ${sharesLeft} cupos de mesa.`,
            },
            { status: 400 }
          );
        }
        const paymentCap = invitePoolPaymentCap(pool);
        if (paymentCap != null && paidShareCount + seatsToCharge > paymentCap) {
          return NextResponse.json(
            { error: "Esta mesa ya está completa." },
            { status: 400 }
          );
        }
      }

      const peopleForSeats: Array<{
        invitedName: string;
        invitedEmail: string | null;
        invitedPhone: string | null;
        ticketTypeId: string;
        unitPrice: number;
        isCover: boolean;
      }> = [];

      for (const line of lineItems) {
        for (let i = 0; i < line.quantity; i++) {
          peopleForSeats.push({
            invitedName: buyerName.trim(),
            invitedEmail: buyerEmail.trim(),
            invitedPhone: buyerPhone?.trim() || null,
            ticketTypeId: line.ticketTypeId,
            unitPrice: line.unitPrice,
            isCover: isCoverCheckout,
          });
        }
      }

      const createdSlots: InviteLoaded[] = [];
      const startSeatNumber = paidCount + 1;

      for (let offset = 0; offset < peopleForSeats.length; offset++) {
        const slotToken = await uniqueInviteToken();
        const person = peopleForSeats[offset];
        const created = await prisma.tableSlotInvite.create({
          data: {
            eventId: pool.eventId,
            ticketTypeId: person.ticketTypeId,
            tableNumber: pool.tableNumber,
            seatNumber: startSeatNumber + offset,
            poolId: pool.id,
            inviteToken: slotToken,
            invitedName: person.invitedName,
            invitedEmail: person.invitedEmail,
            invitedPhone: person.invitedPhone,
            pricePerSeat: person.unitPrice,
            isCover: person.isCover,
            expiresAt: pool.expiresAt,
          },
          include: { event: true, ticketType: true },
        });
        createdSlots.push(created);
      }

      if (!createdSlots[0]) {
        return NextResponse.json({ error: "Error al crear asientos" }, { status: 500 });
      }

      invite = createdSlots[0];
    } else {
      if (invite.status !== "PENDING") {
        return NextResponse.json(
          {
            error:
              invite.status === "PAID"
                ? "Esta invitación ya fue pagada"
                : invite.status === "EXPIRED"
                ? "Esta invitación ha expirado"
                : "Esta invitación no está disponible",
          },
          { status: 400 }
        );
      }

      if (invite.expiresAt && new Date() > invite.expiresAt) {
        await prisma.tableSlotInvite.update({
          where: { id: invite.id },
          data: { status: "EXPIRED" },
        });
        return NextResponse.json(
          { error: "Esta invitación ha expirado" },
          { status: 400 }
        );
      }

      lineItems = [
        {
          ticketTypeId: invite.ticketTypeId,
          quantity: 1,
          unitPrice: Number(invite.pricePerSeat),
        },
      ];
    }

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    const subtotal = lineItems.reduce(
      (sum, l) => sum + l.unitPrice * l.quantity,
      0
    );
    if (subtotal <= 0 || !Number.isFinite(subtotal)) {
      return NextResponse.json(
        { error: "Precio del asiento inválido" },
        { status: 400 }
      );
    }
    const amounts = await calculateSaleAmounts(invite.eventId, subtotal);
    const tax = amounts.serviceFeePesos;
    const total = amounts.totalPesos;

    const userId = sessionUser.id;
    const tableLabel = ticketTableLabel(String(invite.tableNumber));

    let saleId: string;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
          data: {
            eventId: invite.eventId,
            userId,
            channel: "ONLINE",
            status: "PENDING",
            subtotal,
            tax,
            total,
            platformFeeAmount: amounts.platformFeePesos,
            organizerNetAmount: amounts.organizerNetPesos,
            paymentProvider: "stripe",
            buyerName: buyerName.trim(),
            buyerEmail: buyerEmail.trim(),
            buyerPhone: buyerPhone?.trim() || null,
            tableSlotInviteId: invite.id,
            paymentMethod: null,
          },
        });
        for (const line of lineItems) {
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              ticketTypeId: line.ticketTypeId,
              quantity: line.quantity,
              isTable: Boolean(invite.poolId) && !Boolean((invite as { isCover?: boolean }).isCover),
              tableNumber: tableLabel,
            },
          });
        }
        return sale.id;
      });
      saleId = result;
    } catch (txError: unknown) {
      const err = txError as { code?: string; message?: string };
      const code = err?.code || "";
      const msg = err?.message || String(txError);
      if (code === "P2002" || msg.includes("Unique constraint") || msg.includes("tableSlotInviteId")) {
        return NextResponse.json(
          { error: "Esta invitación ya tiene una orden. Revisa tu correo o intenta de nuevo." },
          { status: 400 }
        );
      }
      throw txError;
    }

    return NextResponse.json({
      success: true,
      message: "Redirigiendo a pago",
      data: { saleId },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Checkout invite] Error:", msg, error instanceof Error ? error.stack : "");
    const safeDetails =
      process.env.NODE_ENV === "development"
        ? msg
        : msg.slice(0, 200).replace(/\n/g, " ");
    return NextResponse.json(
      {
        error: "Error al procesar la orden",
        details: safeDetails,
      },
      { status: 500 }
    );
  }
}
