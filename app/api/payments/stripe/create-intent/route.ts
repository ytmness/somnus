import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/payments/stripe";
import { assertOrganizerCanReceivePayments } from "@/lib/payments/connect";
import { calculateSaleAmounts } from "@/lib/payments/commissions";
import { isStripeEnabled } from "@/lib/payments/config";
import {
  cancelPaymentIntentForSale,
  canReusePaymentIntent,
  isDestinationChargePaymentIntent,
  retrievePaymentIntentForSale,
} from "@/lib/payments/stripe-connect-charge";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/stripe/create-intent
 * Destination charge en la plataforma (MX) con application_fee + transfer al organizador.
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

      const matchesFlow =
        !connectedAccountId ||
        isDestinationChargePaymentIntent(existing, connectedAccountId);

      if (canReusePaymentIntent(existing) && matchesFlow) {
        return NextResponse.json({
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
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

    const requiresManualCapture = sale.approvalStatus === "PENDING";

    const intentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
      amount: amounts.totalCents,
      currency: "mxn",
      payment_method_types: ["card"],
      receipt_email: sale.buyerEmail,
      ...(requiresManualCapture ? { capture_method: "manual" as const } : {}),
      metadata: {
        saleId: sale.id,
        eventId: sale.eventId,
        organizerId: organizerInfo?.organizerId || "",
        platformFeeAmount: String(amounts.platformFeeCents),
        serviceFeeAmount: String(amounts.serviceFeeCents),
        connectedAccountId: connectedAccountId || "",
        chargeType: connectedAccountId ? "destination" : "platform",
        source: "somnus.live",
        requiresApproval: String(sale.approvalStatus === "PENDING"),
        depositOnly: String(sale.depositOnly),
      },
    };

    if (connectedAccountId) {
      intentParams.transfer_data = {
        destination: connectedAccountId,
      };
      const platformKeepsCents =
        amounts.platformFeeCents + amounts.serviceFeeCents;
      if (platformKeepsCents > 0) {
        intentParams.application_fee_amount = platformKeepsCents;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams, {
      idempotencyKey: `sale:${sale.id}:create_intent:v6-mx-destination`,
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
        stripeConnectedAccountId: connectedAccountId,
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
