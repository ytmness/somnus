import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { calculateSaleAmounts } from "@/lib/payments/commissions";
import { isStripeEnabled } from "@/lib/payments/config";
import {
  effectiveTicketPriceAt,
} from "@/lib/ticket-pricing";
import { ticketTypeInclude } from "@/lib/ticket-type-persist";

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/payment-link
 * { token, buyerName, buyerEmail, buyerPhone? }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isStripeEnabled()) {
      return NextResponse.json(
        {
          error:
            "El pago con tarjeta no está disponible. Contacta al administrador.",
        },
        { status: 503 }
      );
    }

    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        {
          error: "Debes iniciar sesión para pagar",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const token = String(body?.token || "").trim();
    const buyerName = String(body?.buyerName || "").trim();
    const buyerEmail = String(body?.buyerEmail || "").trim().toLowerCase();
    const buyerPhone = body?.buyerPhone
      ? String(body.buyerPhone).trim()
      : null;

    if (!token || !buyerName || !buyerEmail) {
      return NextResponse.json(
        { error: "Se requiere token, buyerName y buyerEmail" },
        { status: 400 }
      );
    }

    const link = await prisma.paymentLink.findUnique({
      where: { token },
      include: {
        event: {
          include: {
            ticketTypes: { include: ticketTypeInclude },
          },
        },
      },
    });

    if (!link || !link.isActive) {
      return NextResponse.json(
        { error: "Link de pago no encontrado" },
        { status: 404 }
      );
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      return NextResponse.json({ error: "Este link ha expirado" }, { status: 400 });
    }

    if (link.maxUses != null && link.usedCount >= link.maxUses) {
      return NextResponse.json(
        { error: "Este link ya alcanzó el máximo de usos" },
        { status: 400 }
      );
    }

    const now = new Date();
    let chargeSubtotal = 0;
    let ticketTypeId: string | null = link.ticketTypeId;
    const quantity = Math.max(1, link.quantity);

    if (link.amountCents != null && link.amountCents > 0) {
      chargeSubtotal = link.amountCents / 100;
    } else if (ticketTypeId) {
      const tt = link.event.ticketTypes.find((t) => t.id === ticketTypeId);
      if (!tt || !tt.isActive) {
        return NextResponse.json(
          { error: "El tipo de boleto ya no está disponible" },
          { status: 400 }
        );
      }
      const unit = effectiveTicketPriceAt(
        Number(tt.price),
        tt.pricePhases,
        now
      );
      chargeSubtotal = Math.round(unit * quantity * 100) / 100;
    } else {
      return NextResponse.json(
        { error: "Payment link sin monto ni ticket" },
        { status: 400 }
      );
    }

    const amounts = await calculateSaleAmounts(link.eventId, chargeSubtotal);

    const sale = await prisma.sale.create({
      data: {
        eventId: link.eventId,
        userId: user.id,
        channel: "ONLINE",
        status: "PENDING",
        subtotal: chargeSubtotal,
        tax: amounts.serviceFeePesos,
        total: amounts.totalPesos,
        platformFeeAmount: amounts.platformFeePesos,
        organizerNetAmount: amounts.organizerNetPesos,
        paymentProvider: "stripe",
        buyerName,
        buyerEmail,
        buyerPhone,
        paymentLinkId: link.id,
        currency: "MXN",
      },
    });

    if (ticketTypeId) {
      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          ticketTypeId,
          quantity,
          isTable: false,
        },
      });
    } else {
      // Custom amount: attach to cheapest STANDARD type so fulfill can mint tickets
      const fallback = link.event.ticketTypes.find(
        (t) => t.isActive && t.kind === "STANDARD" && !t.isTable
      );
      if (fallback) {
        await prisma.saleItem.create({
          data: {
            saleId: sale.id,
            ticketTypeId: fallback.id,
            quantity,
            isTable: false,
          },
        });
      } else {
        await prisma.sale.delete({ where: { id: sale.id } });
        return NextResponse.json(
          {
            error:
              "No hay tipo de boleto para asociar este pago. Configura ticketTypeId en el link.",
          },
          { status: 400 }
        );
      }
    }

    await prisma.paymentLink.update({
      where: { id: link.id },
      data: { usedCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      message: "Redirigiendo a pago",
      data: { saleId: sale.id },
    });
  } catch (error) {
    console.error("[checkout/payment-link]", error);
    return NextResponse.json(
      { error: "Error al procesar el link de pago" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/checkout/payment-link?token=
 * Datos públicos del link
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "token requerido" }, { status: 400 });
    }

    const link = await prisma.paymentLink.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            artist: true,
            eventDate: true,
            eventTime: true,
            venue: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!link || !link.isActive) {
      return NextResponse.json({ error: "Link no encontrado" }, { status: 404 });
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      return NextResponse.json({ error: "Link expirado" }, { status: 400 });
    }

    if (link.maxUses != null && link.usedCount >= link.maxUses) {
      return NextResponse.json({ error: "Link agotado" }, { status: 400 });
    }

    let amountPesos: number | null =
      link.amountCents != null ? link.amountCents / 100 : null;
    let ticketTypeName: string | null = null;

    if (link.ticketTypeId) {
      const tt = await prisma.ticketType.findUnique({
        where: { id: link.ticketTypeId },
        include: {
          pricePhases: { orderBy: { sortOrder: "asc" } },
        },
      });
      if (tt) {
        ticketTypeName = tt.name;
        if (amountPesos == null) {
          amountPesos =
            effectiveTicketPriceAt(Number(tt.price), tt.pricePhases, new Date()) *
            link.quantity;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        token: link.token,
        label: link.label,
        quantity: link.quantity,
        amountPesos,
        ticketTypeId: link.ticketTypeId,
        ticketTypeName,
        event: link.event,
        expiresAt: link.expiresAt,
      },
    });
  } catch (error) {
    console.error("[checkout/payment-link GET]", error);
    return NextResponse.json({ error: "Error al cargar link" }, { status: 500 });
  }
}
