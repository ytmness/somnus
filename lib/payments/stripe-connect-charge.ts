import type Stripe from "stripe";

/** Destination/on_behalf_of charges fail confirm for US platform + MX connected. */
export function isLegacyDestinationCharge(pi: Stripe.PaymentIntent): boolean {
  return Boolean(pi.transfer_data?.destination || pi.on_behalf_of);
}

export async function retrievePaymentIntentForSale(
  stripe: Stripe,
  paymentIntentId: string,
  connectedAccountId?: string | null
): Promise<Stripe.PaymentIntent> {
  if (connectedAccountId) {
    try {
      return await stripe.paymentIntents.retrieve(
        paymentIntentId,
        {},
        { stripeAccount: connectedAccountId }
      );
    } catch {
      // Legacy intents were created on the platform account.
    }
  }
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

export async function cancelPaymentIntentForSale(
  stripe: Stripe,
  paymentIntentId: string,
  connectedAccountId?: string | null
): Promise<void> {
  const attempts: Array<{ stripeAccount?: string }> = [];
  if (connectedAccountId) attempts.push({ stripeAccount: connectedAccountId });
  attempts.push({});

  for (const opts of attempts) {
    try {
      await stripe.paymentIntents.cancel(paymentIntentId, {}, opts);
      return;
    } catch {
      // try next context
    }
  }
}

export function canReusePaymentIntent(pi: Stripe.PaymentIntent): boolean {
  if (!pi.client_secret) return false;
  if (pi.status === "canceled" || pi.status === "succeeded") return false;
  if (pi.last_payment_error) return false;
  return !isLegacyDestinationCharge(pi);
}
