/**
 * Configuración centralizada de pagos (Stripe).
 */

/** Clave pública: preferir STRIPE_PUBLISHABLE_KEY (runtime) sobre NEXT_PUBLIC (build). */
export function getStripePublishableKey(): string | undefined {
  return (
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
}

export function isStripeEnabled(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && getStripePublishableKey());
}

export function isOxxoEnabled(): boolean {
  return process.env.PAYMENTS_ENABLE_OXXO === "true";
}

export function isInstallmentsEnabled(): boolean {
  return process.env.PAYMENTS_ENABLE_INSTALLMENTS_MX === "true";
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/** País de la cuenta plataforma Stripe (MX en producción Somnus). */
export function getStripePlatformCountry(): string {
  return (process.env.STRIPE_PLATFORM_COUNTRY || "MX").toUpperCase();
}
