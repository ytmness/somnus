/**
 * Cliente Clip para cobros (Checkout Transparente)
 * API base configurable: api.payclip.com (producción) o api.sandbox.payclip.com (pruebas)
 */
const CLIP_API =
  process.env.CLIP_API_URL || "https://api.payclip.com";

export interface ClipChargeRequest {
  amount: number; // En pesos (decimal, ej: 100.50)
  currency: string;
  description: string;
  payment_method: { token: string };
  customer: { email: string; phone?: string };
  external_reference: string; // saleId
}

export interface ClipChargeResponse {
  id: string;
  status: string;
  paid: boolean;
  amount: number;
  [key: string]: unknown;
}

export async function createClipCharge(
  saleId: string,
  totalAmount: number,
  token: string,
  customer: { email: string; phone?: string },
  description: string
): Promise<ClipChargeResponse> {
  const apiKey = process.env.NEXT_PUBLIC_CLIP_API_KEY || process.env.CLIP_API_KEY;
  const secretKey = process.env.CLIP_AUTH_TOKEN;
  if (!apiKey || !secretKey) {
    throw new Error("NEXT_PUBLIC_CLIP_API_KEY y CLIP_AUTH_TOKEN deben estar configurados");
  }

  // Clip usa Basic auth: Base64(ClaveAPI:ClaveSecreta)
  const basicAuth = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");

  // Clip espera el monto (puede ser decimal para pruebas, ej: 0.01)
  const amount = Number(totalAmount);
  const body: ClipChargeRequest = {
    amount,
    currency: "MXN",
    description: description || `Venta Somnus - ${saleId.slice(0, 8)}`,
    payment_method: { token },
    customer: { email: customer.email, ...(customer.phone && { phone: customer.phone }) },
    external_reference: saleId,
  };

  const res = await fetch(`${CLIP_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const errorCode = data?.error_code as string;
    const detail = Array.isArray(data?.detail)
      ? (data.detail as string[]).join(". ")
      : (data?.detail as string);
    const msg =
      detail ||
      (data?.message as string) ||
      (data?.error as string) ||
      `Error al procesar pago con Clip (${res.status})`;
    const fullMsg = errorCode ? `[${errorCode}] ${msg}` : msg;
    console.error("[Clip API]", res.status, errorCode, data);
    throw new Error(fullMsg);
  }

  return data as ClipChargeResponse;
}
