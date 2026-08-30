/**
 * Stub de Stripe Terminal Tap to Pay (iOS / Android).
 * Ver docs/TAP_TO_PAY.md. El POS de /vendedor usará estas APIs cuando
 * Terminal esté integrado.
 */

export function isTapToPayAvailable(): boolean {
  return false;
}

export async function startTapToPayCollect(_options?: {
  amountCents: number;
  currency?: string;
  saleId?: string;
}): Promise<never> {
  throw new Error(
    "Tap to Pay no está implementado. Requiere Stripe Terminal + Tap to Pay (ver docs/TAP_TO_PAY.md)."
  );
}
