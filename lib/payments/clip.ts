/**
 * Cliente Clip para cobros (Checkout Transparente)
 * API: https://api.payclip.com/payments
 */
const CLIP_API = "https://api.payclip.com";

export interface ClipChargeRequest {
  amount: number; // En CENTAVOS (Clip requiere enteros)
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
  const authToken = process.env.CLIP_AUTH_TOKEN;
  if (!authToken) {
    throw new Error("CLIP_AUTH_TOKEN no configurado");
  }

  // Clip espera el monto en centavos (ej: $10.45 → 1045)
  const amountCentavos = Math.round(Number(totalAmount) * 100);
  const body: ClipChargeRequest = {
    amount: amountCentavos,
    currency: "MXN",
    description: description || `Venta Somnus - ${saleId.slice(0, 8)}`,
    payment_method: { token },
    customer: { email: customer.email, ...(customer.phone && { phone: customer.phone }) },
    external_reference: saleId,
  };

  const res = await fetch(`${CLIP_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      (typeof data?.errors === "string" ? data.errors : null) ||
      "Error al procesar pago con Clip";
    throw new Error(String(msg));
  }

  return data as ClipChargeResponse;
}
