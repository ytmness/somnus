import { getStripe } from "@/lib/payments/stripe";
import { isStripeEnabled } from "@/lib/payments/config";

export type StripeFeesVerification = {
  stripeEnabled: boolean;
  stripeTotalPesos: number;
  feeCount: number;
  from?: string;
  to?: string;
};

/**
 * Suma application fees de Stripe en un rango (centavos → pesos).
 */
export async function sumApplicationFeesInRange(
  from?: Date,
  to?: Date
): Promise<StripeFeesVerification> {
  if (!isStripeEnabled()) {
    return { stripeEnabled: false, stripeTotalPesos: 0, feeCount: 0 };
  }

  const stripe = getStripe();
  let totalCents = 0;
  let feeCount = 0;
  let startingAfter: string | undefined;

  const created: { gte?: number; lte?: number } = {};
  if (from) created.gte = Math.floor(from.getTime() / 1000);
  if (to) created.lte = Math.floor(to.getTime() / 1000);

  do {
    const page = await stripe.applicationFees.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
      ...(Object.keys(created).length > 0 ? { created } : {}),
    });

    for (const fee of page.data) {
      if (!fee.refunded) {
        totalCents += fee.amount;
        feeCount += 1;
      }
    }

    if (page.has_more && page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id;
    } else {
      startingAfter = undefined;
    }
  } while (startingAfter);

  return {
    stripeEnabled: true,
    stripeTotalPesos: totalCents / 100,
    feeCount,
    from: from?.toISOString(),
    to: to?.toISOString(),
  };
}
