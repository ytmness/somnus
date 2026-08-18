import { prisma } from "@/lib/db/prisma";
import type { CommissionRule, CommissionType } from "@prisma/client";
import { calculateServiceFee } from "@/lib/utils";

export interface CommissionSplit {
  subtotalCents: number;
  platformFeeCents: number;
  organizerNetCents: number;
  serviceFeeCents: number;
  totalCents: number;
  subtotalPesos: number;
  platformFeePesos: number;
  organizerNetPesos: number;
  serviceFeePesos: number;
  totalPesos: number;
}

export interface ResolvedCommission {
  rule: CommissionRule | null;
  scope: "event" | "organizer" | "global" | "none";
}

/**
 * Resuelve la regla de comisión aplicable: evento → organizador → global.
 */
export async function resolveCommission(
  eventId: string
): Promise<ResolvedCommission> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      commissionRule: true,
      organizer: {
        include: {
          commissionRules: {
            where: { scope: "ORGANIZER", isActive: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!event) {
    return { rule: null, scope: "none" };
  }

  if (event.commissionRule?.isActive) {
    return { rule: event.commissionRule, scope: "event" };
  }

  const organizerRule = event.organizer?.commissionRules?.[0];
  if (organizerRule) {
    return { rule: organizerRule, scope: "organizer" };
  }

  const globalRule = await prisma.commissionRule.findFirst({
    where: { scope: "GLOBAL", isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (globalRule) {
    return { rule: globalRule, scope: "global" };
  }

  return { rule: null, scope: "none" };
}

/**
 * Calcula la comisión de plataforma en centavos a partir de una regla.
 */
export function calculatePlatformFeeCents(
  subtotalCents: number,
  rule: CommissionRule | null
): number {
  if (!rule || subtotalCents <= 0) return 0;

  const type = rule.commissionType as CommissionType;
  let feeCents = 0;

  if (type === "PERCENTAGE" || type === "PERCENTAGE_PLUS_FIXED") {
    const pct = Number(rule.commissionPercentage || 0);
    feeCents += Math.round(subtotalCents * (pct / 100));
  }

  if (type === "FIXED" || type === "PERCENTAGE_PLUS_FIXED") {
    const fixedPesos = Number(rule.commissionFixedAmount || 0);
    feeCents += Math.round(fixedPesos * 100);
  }

  if (feeCents >= subtotalCents) {
    feeCents = Math.max(0, subtotalCents - 1);
  }

  return feeCents;
}

/**
 * Calcula el cargo de servicio de pasarela (lo que paga el cliente además del subtotal).
 * Cubre Stripe estimado + colchón; ver calculateServiceFee.
 */
export function calculateServiceFeeCents(subtotalCents: number): number {
  const subtotalPesos = subtotalCents / 100;
  const { totalCommission } = calculateServiceFee(subtotalPesos);
  return Math.round(totalCommission * 100);
}

/**
 * Calcula el desglose completo de una venta.
 */
export function calculateSplit(
  subtotalPesos: number,
  rule: CommissionRule | null,
  options?: { includeServiceFee?: boolean }
): CommissionSplit {
  const includeServiceFee = options?.includeServiceFee ?? true;
  const subtotalCents = Math.round(subtotalPesos * 100);
  const platformFeeCents = calculatePlatformFeeCents(subtotalCents, rule);
  const serviceFeeCents = includeServiceFee
    ? calculateServiceFeeCents(subtotalCents)
    : 0;
  const organizerNetCents = subtotalCents - platformFeeCents;
  const totalCents = subtotalCents + serviceFeeCents;

  return {
    subtotalCents,
    platformFeeCents,
    organizerNetCents,
    serviceFeeCents,
    totalCents,
    subtotalPesos,
    platformFeePesos: platformFeeCents / 100,
    organizerNetPesos: organizerNetCents / 100,
    serviceFeePesos: serviceFeeCents / 100,
    totalPesos: totalCents / 100,
  };
}

/**
 * Calcula montos de venta para checkout (servidor).
 */
export async function calculateSaleAmounts(
  eventId: string,
  subtotalPesos: number
): Promise<CommissionSplit & { hasOrganizer: boolean }> {
  const { rule } = await resolveCommission(eventId);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });

  const includeServiceFee = true;
  const split = calculateSplit(subtotalPesos, rule, { includeServiceFee });

  return {
    ...split,
    hasOrganizer: !!event?.organizerId,
  };
}
