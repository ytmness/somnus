import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/payments/stripe";
import { assertOrganizerCanReceivePayments } from "@/lib/payments/connect";

export const dynamic = "force-dynamic";

/**
 * GET /api/sales/balance/[token]
 * Resumen de venta por balancePayToken (público).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { balancePayToken: params.token },
      include: {
        event: {
          select: { id: true, name: true, artist: true, eventDate: true },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
    }

    if (!sale.depositOnly || !sale.balanceDueCents || sale.balanceDueCents <= 0) {
      return NextResponse.json(
        { error: "Esta venta no tiene saldo pendiente" },
        { status: 409 }
      );
    }

    if (sale.balancePaidAt) {
      return NextResponse.json({
        success: true,
        data: {
          paid: true,
          event: sale.event,
          buyerName: sale.buyerName,
          balanceDueCents: sale.balanceDueCents,
          balancePaidAt: sale.balancePaidAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        paid: false,
        saleId: sale.id,
        event: sale.event,
        buyerName: sale.buyerName,
        buyerEmail: sale.buyerEmail,
        balanceDueCents: sale.balanceDueCents,
        balanceDuePesos: sale.balanceDueCents / 100,
        depositPaid: Number(sale.total),
      },
    });
  } catch (error) {
    console.error("[balance GET] Error:", error);
    return NextResponse.json({ error: "Error al cargar saldo" }, { status: 500 });
  }
}

/**
 * POST /api/sales/balance/[token]
 * Crea PaymentIntent para el saldo pendiente.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { balancePayToken: params.token },
      include: { event: { include: { organizer: true } } },
    });

    if (!sale) {
      return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
    }

    if (!sale.depositOnly || !sale.balanceDueCents || sale.balanceDueCents <= 0) {
      return NextResponse.json(
        { error: "Esta venta no tiene saldo pendiente" },
        { status: 409 }
      );
    }

    if (sale.balancePaidAt) {
      return NextResponse.json(
        { error: "El saldo ya fue pagado" },
        { status: 409 }
      );
    }

    if (sale.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "La venta inicial aún no está completada" },
        { status: 409 }
      );
    }

    const organizerInfo = await assertOrganizerCanReceivePayments(sale.eventId).catch(
      (err: Error) => {
        if (sale.event?.organizerId) throw err;
        return null;
      }
    );

    const connectedAccountId = organizerInfo?.stripeAccountId || null;
    const stripe = getStripe();

    const intentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
      amount: sale.balanceDueCents,
      currency: "mxn",
      automatic_payment_methods: { enabled: true },
      receipt_email: sale.buyerEmail,
      metadata: {
        saleId: sale.id,
        eventId: sale.eventId,
        balancePayment: "true",
        connectedAccountId: connectedAccountId || "",
        source: "somnus.live",
      },
    };

    if (connectedAccountId) {
      intentParams.transfer_data = { destination: connectedAccountId };
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams, {
      idempotencyKey: `sale:${sale.id}:balance_intent:v1`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      saleId: sale.id,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[balance POST] Error:", msg);
    return NextResponse.json(
      { error: msg || "Error al crear pago de saldo" },
      { status: 500 }
    );
  }
}
