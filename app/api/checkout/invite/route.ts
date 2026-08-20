import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { calculateSaleAmounts } from "@/lib/payments/commissions";
import { isStripeEnabled } from "@/lib/payments/config";
import { ticketTableLabel } from "@/lib/table-invite";
import { ticketTypeInclude } from "@/lib/ticket-type-persist";
import { invitePoolPaymentCap } from "@/lib/ticket-pricing";
import {
  canBuyInviteTicket,
  pickTicketsForInviteLink,
  openInviteTableTickets,
  toInviteTicketPayload,
} from "@/lib/invite-tickets";
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
    const { inviteToken, buyerName, buyerEmail, buyerPhone, extraPeople, items } = body as {
      inviteToken?: string;
      buyerName?: string;
      buyerEmail?: string;
      buyerPhone?: string;
      extraPeople?: Array<{ name?: string; email?: string; phone?: string }>;
      items?: Array<{ ticketTypeId?: string; quantity?: number }>;
    };

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
        include: { event: true, ticketType: true },
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

      const paidCount = await prisma.tableSlotInvite.count({
        where: { poolId: pool.id, status: "PAID" },
      });

      const requestedItems = Array.isArray(items)
        ? items
            .map((it) => ({
              ticketTypeId: String(it?.ticketTypeId || ""),
              quantity: Math.floor(Number(it?.quantity) || 0),
            }))
            .filter((it) => it.ticketTypeId && it.quantity > 0)
        : [];

      if (requestedItems.length > 0) {
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

        const allowed = openInviteTableTickets(
          pickTicketsForInviteLink(
            event.ticketTypes
              .map((tt) => toInviteTicketPayload(tt, now))
              .filter((tt): tt is NonNullable<typeof tt> => Boolean(tt)),
            pool.ticketTypeId
          )
        );
        for (const req of requestedItems) {
          const mapped = allowed.find((tt) => tt.id === req.ticketTypeId);
          if (!mapped) {
            return NextResponse.json(
              { error: "Uno de los boletos seleccionados no está disponible en este link de mesa" },
              { status: 400 }
            );
          }
          const check = canBuyInviteTicket(eventWindow, mapped, req.quantity, now);
          if (!check.ok) {
            return NextResponse.json({ error: check.error }, { status: 400 });
          }
          lineItems.push({
            ticketTypeId: mapped.id,
            quantity: req.quantity,
            unitPrice: mapped.price,
          });
        }
      } else {
        lineItems = [
          {
            ticketTypeId: pool.ticketTypeId,
            quantity: 1 + extras.length,
            unitPrice: Number(pool.pricePerSeat),
          },
        ];
      }

      const seatsToCharge = lineItems.reduce((sum, l) => sum + l.quantity, 0);
      if (seatsToCharge < 1) {
        return NextResponse.json(
          { error: "Selecciona al menos un boleto" },
          { status: 400 }
        );
      }

      const paymentCap = invitePoolPaymentCap(pool);
      if (paymentCap != null && paidCount + seatsToCharge > paymentCap) {
        return NextResponse.json(
          { error: "Esta mesa ya está completa. Todos los espacios han sido pagados." },
          { status: 400 }
        );
      }

      const peopleForSeats: Array<{
        invitedName: string;
        invitedEmail: string | null;
        invitedPhone: string | null;
        ticketTypeId: string;
        unitPrice: number;
      }> = [];

      if (requestedItems.length > 0) {
        for (const line of lineItems) {
          for (let i = 0; i < line.quantity; i++) {
            peopleForSeats.push({
              invitedName: buyerName.trim(),
              invitedEmail: buyerEmail.trim(),
              invitedPhone: buyerPhone?.trim() || null,
              ticketTypeId: line.ticketTypeId,
              unitPrice: line.unitPrice,
            });
          }
        }
      } else {
        const extraRows = [
          {
            invitedName: buyerName.trim(),
            invitedEmail: buyerEmail.trim(),
            invitedPhone: buyerPhone?.trim() || null,
          },
          ...extras.map((p) => ({
            invitedName: p.name,
            invitedEmail: p.email ?? null,
            invitedPhone: p.phone ?? null,
          })),
        ];
        for (const row of extraRows) {
          peopleForSeats.push({
            ...row,
            ticketTypeId: pool.ticketTypeId,
            unitPrice: Number(pool.pricePerSeat),
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
              isTable: true,
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
