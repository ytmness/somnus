import type { DiscountCode, DiscountType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type DiscountValidationResult =
  | {
      valid: true;
      discountAmount: number;
      discountCodeId: string;
      code: string;
      discountType: DiscountType;
      value: number;
    }
  | {
      valid: false;
      error: string;
      discountAmount: 0;
      discountCodeId: null;
    };

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeDiscountAmount(
  discountType: DiscountType,
  value: number,
  subtotal: number
): number {
  if (subtotal <= 0) return 0;
  if (discountType === "PERCENTAGE") {
    const pct = Math.min(100, Math.max(0, value));
    return roundMoney((subtotal * pct) / 100);
  }
  return roundMoney(Math.min(subtotal, Math.max(0, value)));
}

export function evaluateDiscountCode(
  dc: Pick<
    DiscountCode,
    | "id"
    | "code"
    | "discountType"
    | "value"
    | "maxUses"
    | "usedCount"
    | "minSubtotal"
    | "startsAt"
    | "endsAt"
    | "isActive"
    | "eventId"
  >,
  eventId: string,
  subtotal: number,
  now: Date = new Date()
): DiscountValidationResult {
  if (!dc.isActive) {
    return {
      valid: false,
      error: "Código inactivo",
      discountAmount: 0,
      discountCodeId: null,
    };
  }

  if (dc.eventId && dc.eventId !== eventId) {
    return {
      valid: false,
      error: "Código no válido para este evento",
      discountAmount: 0,
      discountCodeId: null,
    };
  }

  if (dc.startsAt && now < dc.startsAt) {
    return {
      valid: false,
      error: "Código aún no vigente",
      discountAmount: 0,
      discountCodeId: null,
    };
  }

  if (dc.endsAt && now > dc.endsAt) {
    return {
      valid: false,
      error: "Código expirado",
      discountAmount: 0,
      discountCodeId: null,
    };
  }

  if (dc.maxUses != null && dc.usedCount >= dc.maxUses) {
    return {
      valid: false,
      error: "Código agotado",
      discountAmount: 0,
      discountCodeId: null,
    };
  }

  const minSub = dc.minSubtotal != null ? Number(dc.minSubtotal) : null;
  if (minSub != null && subtotal < minSub) {
    return {
      valid: false,
      error: `Subtotal mínimo $${minSub.toLocaleString("es-MX")}`,
      discountAmount: 0,
      discountCodeId: null,
    };
  }

  const discountAmount = computeDiscountAmount(
    dc.discountType,
    Number(dc.value),
    subtotal
  );

  if (discountAmount <= 0) {
    return {
      valid: false,
      error: "El descuento no aplica a este monto",
      discountAmount: 0,
      discountCodeId: null,
    };
  }

  return {
    valid: true,
    discountAmount,
    discountCodeId: dc.id,
    code: dc.code,
    discountType: dc.discountType,
    value: Number(dc.value),
  };
}

/**
 * Busca y valida un código (por evento o global sin eventId).
 */
export async function validateDiscountCode(params: {
  code: string;
  eventId: string;
  subtotal: number;
  now?: Date;
}): Promise<DiscountValidationResult> {
  const raw = params.code.trim().toUpperCase();
  if (!raw) {
    return {
      valid: false,
      error: "Código vacío",
      discountAmount: 0,
      discountCodeId: null,
    };
  }

  const subtotal = Math.max(0, Number(params.subtotal) || 0);
  const now = params.now ?? new Date();

  const dc =
    (await prisma.discountCode.findFirst({
      where: {
        code: raw,
        OR: [{ eventId: params.eventId }, { eventId: null }],
      },
      orderBy: { eventId: "desc" },
    })) || null;

  if (!dc) {
    return {
      valid: false,
      error: "Código no encontrado",
      discountAmount: 0,
      discountCodeId: null,
    };
  }

  return evaluateDiscountCode(dc, params.eventId, subtotal, now);
}
