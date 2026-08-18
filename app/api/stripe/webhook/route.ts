import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/payments/stripe";
import { fulfillSale, reverseSale } from "@/lib/payments/fulfill-sale";
import { syncOrganizerStripeStatus } from "@/lib/payments/connect";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhook
 * Webhook firmado de Stripe — fuente de verdad para fulfillment.
 */
export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET no configurado");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/webhook] Firma inválida:", msg);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const existing = await prisma.paymentWebhookEvent.findUnique({
    where: { providerEventId: event.id },
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const saleIdFromMeta = extractSaleId(event);

  await prisma.paymentWebhookEvent.create({
    data: {
      provider: "stripe",
      providerEventId: event.id,
      type: event.type,
      saleId: saleIdFromMeta,
      livemode: event.livemode,
      payload: event as unknown as object,
    },
  });

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const saleId = pi.metadata?.saleId;
        if (!saleId) break;

        if (pi.metadata?.balancePayment === "true") {
          await prisma.sale.update({
            where: { id: saleId },
            data: {
              balancePaidAt: new Date(),
              providerStatus: pi.status,
              lastWebhookEventId: event.id,
            },
          });
          await prisma.paymentWebhookEvent.update({
            where: { providerEventId: event.id },
            data: { processedAt: new Date() },
          });
          break;
        }

        const sale = await prisma.sale.findUnique({
          where: { id: saleId },
          select: { approvalStatus: true },
        });

        if (sale?.approvalStatus === "PENDING") {
          await prisma.sale.update({
            where: { id: saleId },
            data: {
              paymentProvider: "stripe",
              providerStatus: pi.status,
              lastWebhookEventId: event.id,
            },
          });
          await prisma.paymentWebhookEvent.update({
            where: { providerEventId: event.id },
            data: { processedAt: new Date() },
          });
          break;
        }

        const chargeId =
          typeof pi.latest_charge === "string"
            ? pi.latest_charge
            : pi.latest_charge?.id;

        await fulfillSale({
          saleId,
          provider: "stripe",
          providerPaymentId: pi.id,
          providerStatus: pi.status,
          webhookEventId: event.id,
          stripeChargeId: chargeId || undefined,
          stripeConnectedAccountId: pi.metadata?.connectedAccountId || undefined,
        });

        await prisma.paymentWebhookEvent.update({
          where: { providerEventId: event.id },
          data: { processedAt: new Date() },
        });
        break;
      }

      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const saleId = pi.metadata?.saleId;
        if (!saleId) break;

        const sale = await prisma.sale.findUnique({
          where: { id: saleId },
          select: { approvalStatus: true },
        });

        await prisma.sale.update({
          where: { id: saleId },
          data: {
            paymentProvider: "stripe",
            providerStatus: pi.status,
            lastWebhookEventId: event.id,
          },
        });

        if (
          sale?.approvalStatus === "PENDING" &&
          pi.status === "requires_capture"
        ) {
          await prisma.paymentWebhookEvent.update({
            where: { providerEventId: event.id },
            data: { processedAt: new Date() },
          });
          break;
        }

        if (sale?.approvalStatus !== "PENDING" && pi.status === "requires_capture") {
          const chargeId =
            typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge?.id;

          await fulfillSale({
            saleId,
            provider: "stripe",
            providerPaymentId: pi.id,
            providerStatus: "requires_capture",
            webhookEventId: event.id,
            stripeChargeId: chargeId || undefined,
            stripeConnectedAccountId: pi.metadata?.connectedAccountId || undefined,
          }).catch(() => {});
        }

        await prisma.paymentWebhookEvent.update({
          where: { providerEventId: event.id },
          data: { processedAt: new Date() },
        });
        break;
      }

      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const saleId = pi.metadata?.saleId;
        if (!saleId) break;

        await prisma.sale.update({
          where: { id: saleId },
          data: {
            paymentProvider: "stripe",
            providerStatus: pi.status,
            lastWebhookEventId: event.id,
          },
        });

        await prisma.paymentWebhookEvent.update({
          where: { providerEventId: event.id },
          data: { processedAt: new Date() },
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

        if (!piId) break;

        const sale = await prisma.sale.findFirst({
          where: { paymentIntentId: piId },
        });
        if (sale) {
          await reverseSale(sale.id);
        }

        await prisma.paymentWebhookEvent.update({
          where: { providerEventId: event.id },
          data: { processedAt: new Date(), saleId: sale?.id },
        });
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        console.warn("[stripe/webhook] Disputa creada:", dispute.id, dispute.reason);
        await prisma.paymentWebhookEvent.update({
          where: { providerEventId: event.id },
          data: { processedAt: new Date() },
        });
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const organizer = await prisma.organizer.findFirst({
          where: { stripeAccountId: account.id },
        });
        if (organizer) {
          await syncOrganizerStripeStatus(organizer.id);
        }
        await prisma.paymentWebhookEvent.update({
          where: { providerEventId: event.id },
          data: { processedAt: new Date() },
        });
        break;
      }

      default:
        break;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[stripe/webhook] Error procesando ${event.type}:`, msg);
    return NextResponse.json({ received: true, error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function extractSaleId(event: Stripe.Event): string | null {
  const obj = event.data.object as { metadata?: { saleId?: string } };
  return obj.metadata?.saleId || null;
}
