import { NextResponse } from "next/server";
import { getStripePublishableKey, isStripeEnabled } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/stripe/public-config
 * Configuración pública de pagos para el frontend.
 */
export async function GET() {
  return NextResponse.json({
    publishableKey: getStripePublishableKey() || null,
    stripeEnabled: isStripeEnabled(),
  });
}
