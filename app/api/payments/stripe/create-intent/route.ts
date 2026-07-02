import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/payments/stripe";
import { assertOrganizerCanReceivePayments } from "@/lib/payments/connect";
import { calculateSaleAmounts } from "@/lib/payments/commissions";
import { isStripeEnabled } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/stripe/create-intent
 * Crea o reutiliza un PaymentIntent para una venta pendiente.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isStripeEnabled()) {
      return NextResponse.json(
        { error: "Stripe no está configurado. Contacta al administrador." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { saleId } = body;

    if (!saleId) {
      return NextResponse.json({ error: "saleId requerido" }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { event: { include: { organizer: true } } },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    if (sale.status !== "PENDING") {
      return NextResponse.json(
        { error: "La venta ya no está pendiente" },
        { status: 409 }
      );
    }

    if (sale.paymentIntentId) {
      const stripe = getStripe();
      const existing = await stripe.paymentIntents.retrieve(sale.paymentIntentId);
      if (
        existing.status !== "canceled" &&
        existing.status !== "succeeded" &&
        existing.client_secret
      ) {
        return NextResponse.json({
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
        });
      }
    }

    const amounts = await calculateSaleAmounts(sale.eventId, Number(sale.subtotal));
    const organizerInfo = await assertOrganizerCanReceivePayments(sale.eventId).catch(
      (err: Error) => {
        if (sale.event?.organizerId) {
          throw err;
        }
        return null;
      }
    );

    const stripe = getStripe();

    const intentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
      amount: amounts.totalCents,
      currency: "mxn",
      automatic_payment_methods: { enabled: true },
      receipt_email: sale.buyerEmail,
      metadata: {
        saleId: sale.id,
        eventId: sale.eventId,
        organizerId: organizerInfo?.organizerId || "",
        platformFeeAmount: String(amounts.platformFeeCents),
        connectedAccountId: organizerInfo?.stripeAccountId || "",
        source: "somnus.live",
      },
    };

    if (organizerInfo?.stripeAccountId) {
      intentParams.transfer_data = {
        destination: organizerInfo.stripeAccountId,
      };
      const platformKeepsCents =
        amounts.platformFeeCents + amounts.serviceFeeCents;
      if (platformKeepsCents > 0) {
        intentParams.application_fee_amount = platformKeepsCents;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams, {
      idempotencyKey: `sale:${sale.id}:create_intent`,
    });

    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        paymentProvider: "stripe",
        paymentMethod: "stripe",
        paymentId: paymentIntent.id,
        paymentIntentId: paymentIntent.id,
        providerStatus: paymentIntent.status,
        platformFeeAmount: amounts.platformFeePesos,
        organizerNetAmount: amounts.organizerNetPesos,
        stripeConnectedAccountId: organizerInfo?.stripeAccountId || null,
        tax: amounts.serviceFeePesos,
        total: amounts.totalPesos,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-intent] Error:", msg);
    return NextResponse.json(
      { error: msg || "Error al crear PaymentIntent" },
      { status: 500 }
    );
  }
}
