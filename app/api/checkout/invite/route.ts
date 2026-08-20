import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { calculateSaleAmounts } from "@/lib/payments/commissions";
import { isStripeEnabled } from "@/lib/payments/config";
import { ticketTableLabel } from "@/lib/table-invite";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateInviteToken(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8);
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
    const { inviteToken, buyerName, buyerEmail, buyerPhone, extraPeople } = body as {
      inviteToken?: string;
      buyerName?: string;
      buyerEmail?: string;
      buyerPhone?: string;
      extraPeople?: Array<{ name?: string; email?: string; phone?: string }>;
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

    // 1. Buscar TableSlotInvite (link individual)
    let invite = await prisma.tableSlotInvite.findUnique({
      where: { inviteToken },
      include: { event: true, ticketType: true },
    });

    // Se asume 1 asiento (el del comprador). En modo pool podemos agregar extraPeople para pagar varios asientos en un solo checkout.
    let seatsToCharge = 1;
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

    // 2. Si no existe, buscar TableInvitePool (money pool)
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
      // En pool, el comprador siempre toma 1 asiento + (extras.length) adicionales
      seatsToCharge = 1 + extras.length;

      if (pool.maxSlots != null && paidCount + seatsToCharge > pool.maxSlots) {
        return NextResponse.json(
          { error: "Esta mesa ya está completa. Todos los espacios han sido pagados." },
          { status: 400 }
        );
      }

      // Crear los seats pendientes en el mismo checkout
      const peopleForSeats = [
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

      let firstCreated: any = null;
      const startSeatNumber = paidCount + 1;

      for (let offset = 0; offset < peopleForSeats.length; offset++) {
        const nextSeatNumber = startSeatNumber + offset;

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

        const created = await prisma.tableSlotInvite.create({
          data: {
            eventId: pool.eventId,
            ticketTypeId: pool.ticketTypeId,
            tableNumber: pool.tableNumber,
            seatNumber: nextSeatNumber,
            poolId: pool.id,
            inviteToken: slotToken,
            invitedName: peopleForSeats[offset].invitedName,
            invitedEmail: peopleForSeats[offset].invitedEmail,
            invitedPhone: peopleForSeats[offset].invitedPhone,
            pricePerSeat: pool.pricePerSeat,
            expiresAt: pool.expiresAt,
          },
          include: { event: true, ticketType: true },
        });

        if (!firstCreated) firstCreated = created;
      }

      if (!firstCreated) {
        return NextResponse.json({ error: "Error al crear asientos" }, { status: 500 });
      }

      invite = firstCreated;
    } else {
      // Flujo TableSlotInvite existente
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
    }

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    const subtotal = Number(invite.pricePerSeat) * seatsToCharge;
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
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            ticketTypeId: invite.ticketTypeId,
            quantity: seatsToCharge,
            isTable: true,
            tableNumber: ticketTableLabel(String(invite.tableNumber)),
          },
        });
        return sale.id;
      });
      saleId = result;
    } catch (txError: any) {
      const code = txError?.code || "";
      const msg = txError?.message || String(txError);
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
