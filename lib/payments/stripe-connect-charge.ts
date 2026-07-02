import type Stripe from "stripe";

const US_PLATFORM_BLOCKED_CONNECTED = new Set([
  "MX",
  "BR",
  "IN",
  "MY",
  "SG",
  "TH",
]);

/** Destination/on_behalf_of charges fail confirm for US platform + MX connected. */
export function isLegacyDestinationCharge(pi: Stripe.PaymentIntent): boolean {
  return Boolean(pi.transfer_data?.destination || pi.on_behalf_of);
}

/**
 * Stripe blocks application_fee_amount on confirm for US platforms paying out
 * to connected accounts in several countries (including MX).
 */
export async function isApplicationFeeBlockedForConnectedAccount(
  stripe: Stripe,
  connectedAccountId: string
): Promise<boolean> {
  const connected = await stripe.accounts.retrieve(connectedAccountId);
  const connectedCountry = connected.country?.toUpperCase();
  const platformCountry = (
    process.env.STRIPE_PLATFORM_COUNTRY || "US"
  ).toUpperCase();

  if (!connectedCountry || platformCountry === connectedCountry) {
    return false;
  }

  return (
    platformCountry === "US" && US_PLATFORM_BLOCKED_CONNECTED.has(connectedCountry)
  );
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

export function canReusePaymentIntent(
  pi: Stripe.PaymentIntent,
  options?: { blockApplicationFee?: boolean }
): boolean {
  if (!pi.client_secret) return false;
  if (pi.status === "canceled" || pi.status === "succeeded") return false;
  if (pi.last_payment_error) return false;
  if (isLegacyDestinationCharge(pi)) return false;
  if (options?.blockApplicationFee && pi.application_fee_amount) return false;
  return true;
}
