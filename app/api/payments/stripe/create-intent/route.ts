import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/payments/stripe";
import { assertOrganizerCanReceivePayments } from "@/lib/payments/connect";
import { calculateSaleAmounts } from "@/lib/payments/commissions";
import { isStripeEnabled } from "@/lib/payments/config";
import {
  cancelPaymentIntentForSale,
  canReusePaymentIntent,
  retrievePaymentIntentForSale,
} from "@/lib/payments/stripe-connect-charge";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/stripe/create-intent
 * Crea o reutiliza un PaymentIntent para una venta pendiente.
 *
 * US platform + MX organizers: direct charge on the connected account
 * (destination charges fail on confirm even without application_fee).
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

    const amounts = await calculateSaleAmounts(sale.eventId, Number(sale.subtotal));
    const organizerInfo = await assertOrganizerCanReceivePayments(sale.eventId).catch(
      (err: Error) => {
        if (sale.event?.organizerId) {
          throw err;
        }
        return null;
      }
    );

    const connectedAccountId = organizerInfo?.stripeAccountId || null;
    const stripe = getStripe();

    if (sale.paymentIntentId) {
      const existing = await retrievePaymentIntentForSale(
        stripe,
        sale.paymentIntentId,
        connectedAccountId || sale.stripeConnectedAccountId
      );

      if (canReusePaymentIntent(existing)) {
        return NextResponse.json({
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
          stripeAccountId: connectedAccountId,
        });
      }

      if (existing.status !== "canceled" && existing.status !== "succeeded") {
        await cancelPaymentIntentForSale(
          stripe,
          existing.id,
          connectedAccountId || sale.stripeConnectedAccountId
        );
      }
    }

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
        connectedAccountId: connectedAccountId || "",
        chargeType: connectedAccountId ? "direct" : "platform",
        source: "somnus.live",
      },
    };

    const requestOptions: Parameters<typeof stripe.paymentIntents.create>[1] = {
      idempotencyKey: `sale:${sale.id}:create_intent:v4-direct`,
    };

    if (connectedAccountId) {
      const platformKeepsCents =
        amounts.platformFeeCents + amounts.serviceFeeCents;
      if (platformKeepsCents > 0) {
        intentParams.application_fee_amount = platformKeepsCents;
      }
      requestOptions.stripeAccount = connectedAccountId;
    }

    const paymentIntent = await stripe.paymentIntents.create(
      intentParams,
      requestOptions
    );

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
        stripeConnectedAccountId: connectedAccountId,
        tax: amounts.serviceFeePesos,
        total: amounts.totalPesos,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      stripeAccountId: connectedAccountId,
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
