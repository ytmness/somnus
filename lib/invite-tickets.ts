import type { TicketKind } from "@prisma/client";
import { effectiveTicketPriceAt } from "@/lib/ticket-pricing";
import { isSalesOpen } from "@/lib/ticket-sales-window";

export function isInviteTicketVisible(
  kind: TicketKind | string,
  isTable: boolean
): boolean {
  if (kind === "TABLE") return true;
  if (kind === "STANDARD" && !isTable) return true;
  return false;
}

export type InviteTicketTypePayload = {
  id: string;
  name: string;
  description: string | null;
  kind: "STANDARD" | "TABLE";
  price: number;
  maxQuantity: number;
  soldQuantity: number;
  minPurchaseQty: number;
  maxPurchaseQty: number | null;
  manualSoldOut: boolean;
  salesStartDate: string | null;
  salesEndDate: string | null;
};

type TicketRow = {
  id: string;
  name: string;
  description?: string | null;
  kind: TicketKind | string;
  isTable: boolean;
  isActive?: boolean;
  isHidden?: boolean;
  passwordHash?: string | null;
  price: unknown;
  pricePhases?: Parameters<typeof effectiveTicketPriceAt>[1];
  maxQuantity: number;
  soldQuantity: number;
  minPurchaseQty?: number | null;
  maxPurchaseQty?: number | null;
  manualSoldOut?: boolean;
  salesStartDate?: Date | string | null;
  salesEndDate?: Date | string | null;
};

export function toInviteTicketPayload(
  tt: TicketRow,
  now: Date = new Date()
): InviteTicketTypePayload | null {
  if (tt.isActive === false) return null;
  if (tt.isHidden) return null;
  if (tt.passwordHash) return null;
  if (!isInviteTicketVisible(tt.kind, tt.isTable)) return null;

  const price = effectiveTicketPriceAt(
    Number(tt.price),
    tt.pricePhases ?? null,
    now
  );
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    id: tt.id,
    name: tt.name,
    description: tt.description ?? null,
    kind: tt.kind === "TABLE" ? "TABLE" : "STANDARD",
    price,
    maxQuantity: tt.maxQuantity,
    soldQuantity: tt.soldQuantity,
    minPurchaseQty: tt.minPurchaseQty ?? 1,
    maxPurchaseQty: tt.maxPurchaseQty ?? null,
    manualSoldOut: Boolean(tt.manualSoldOut),
    salesStartDate: tt.salesStartDate
      ? new Date(tt.salesStartDate).toISOString()
      : null,
    salesEndDate: tt.salesEndDate
      ? new Date(tt.salesEndDate).toISOString()
      : null,
  };
}

export function isInviteTicketSoldOut(tt: InviteTicketTypePayload): boolean {
  return (
    tt.manualSoldOut || tt.maxQuantity - (tt.soldQuantity || 0) <= 0
  );
}

export function inviteTicketAvailable(tt: InviteTicketTypePayload): number {
  return Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0));
}

export function canBuyInviteTicket(
  event: { salesStartDate: Date | string; salesEndDate: Date | string },
  tt: InviteTicketTypePayload,
  quantity: number,
  now: Date = new Date()
): { ok: true } | { ok: false; error: string } {
  if (isInviteTicketSoldOut(tt)) {
    return { ok: false, error: `${tt.name} está agotado` };
  }
  if (!isSalesOpen(event, tt, now)) {
    return { ok: false, error: `${tt.name} no está en venta ahora` };
  }
  const available = inviteTicketAvailable(tt);
  const min = tt.minPurchaseQty || 1;
  if (quantity < min) {
    return { ok: false, error: `Mínimo ${min} boletos para ${tt.name}` };
  }
  if (tt.maxPurchaseQty != null && quantity > tt.maxPurchaseQty) {
    return { ok: false, error: `Máximo ${tt.maxPurchaseQty} boletos para ${tt.name}` };
  }
  if (quantity > available) {
    return {
      ok: false,
      error: `Solo hay ${available} disponibles para ${tt.name}`,
    };
  }
  return { ok: true };
}
