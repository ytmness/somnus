import type Stripe from "stripe";
import { getStripePlatformCountry } from "@/lib/payments/config";

/** Países conectados donde una plataforma US no puede usar application_fee (Stripe). */
const US_PLATFORM_BLOCKED_CONNECTED = new Set([
  "MX",
  "BR",
  "IN",
  "MY",
  "SG",
  "TH",
]);

/** PI con on_behalf_of (workaround US→MX obsoleto). */
export function isLegacyDestinationCharge(pi: Stripe.PaymentIntent): boolean {
  return Boolean(pi.on_behalf_of);
}

/** PI destination charge válido para organizador conectado. */
export function isDestinationChargePaymentIntent(
  pi: Stripe.PaymentIntent,
  connectedAccountId: string
): boolean {
  const dest =
    typeof pi.transfer_data?.destination === "string"
      ? pi.transfer_data.destination
      : pi.transfer_data?.destination?.id;
  return dest === connectedAccountId;
}

/**
 * Futuro multi-región: true si application_fee no está permitido para este par
 * plataforma↔conectada. Con plataforma MX + organizador MX siempre es false.
 */
export async function isApplicationFeeBlockedForConnectedAccount(
  stripe: Stripe,
  connectedAccountId: string
): Promise<boolean> {
  const connected = await stripe.accounts.retrieve(connectedAccountId);
  const connectedCountry = connected.country?.toUpperCase();
  const platformCountry = getStripePlatformCountry();

  if (!connectedCountry || platformCountry === connectedCountry) {
    return false;
  }

  return (
    platformCountry === "US" &&
    US_PLATFORM_BLOCKED_CONNECTED.has(connectedCountry)
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
      // PIs legacy direct charge viven en la cuenta conectada.
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
      // intentar otro contexto
    }
  }
}

export function canReusePaymentIntent(pi: Stripe.PaymentIntent): boolean {
  if (!pi.client_secret) return false;
  if (pi.status === "canceled" || pi.status === "succeeded") return false;
  if (pi.last_payment_error) return false;
  if (isLegacyDestinationCharge(pi)) return false;
  return true;
}
