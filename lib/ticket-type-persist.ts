import type { createEventSchema } from "@/lib/validations/schemas";
import { hashTicketPassword, optionalDate } from "@/lib/ticket-access";
import type { z } from "zod";

type TicketInput = z.infer<typeof createEventSchema>["ticketTypes"][number];

export async function mapTicketTypeCreateData(tt: TicketInput) {
  let passwordHash: string | null = null;
  if (tt.password && tt.password.trim()) {
    passwordHash = await hashTicketPassword(tt.password.trim());
  }

  return {
    name: tt.name.trim(),
    description: tt.description,
    category: tt.category,
    price: Number(tt.price),
    maxQuantity: Number(tt.maxQuantity),
    isTable: tt.isTable || false,
    seatsPerTable: tt.seatsPerTable,
    kind: tt.kind || "STANDARD",
    isActive: true,
    isHidden: Boolean(tt.isHidden),
    manualSoldOut: Boolean(tt.manualSoldOut),
    salesStartDate: optionalDate(tt.salesStartDate ?? null),
    salesEndDate: optionalDate(tt.salesEndDate ?? null),
    validUntil: optionalDate(tt.validUntil ?? null),
    minPurchaseQty: tt.minPurchaseQty ?? 1,
    maxPurchaseQty: tt.maxPurchaseQty ?? null,
    requiresApproval: tt.requiresApproval ?? false,
    passwordHash,
    linkedTicketTypeId: tt.linkedTicketTypeId || null,
    tableCapacity:
      (tt.kind || "STANDARD") === "TABLE"
        ? tt.tableCapacity ?? 4
        : tt.tableCapacity ?? null,
    depositEnabled: tt.depositEnabled ?? false,
    depositPercent: tt.depositPercent ?? null,
    variablePricingEnabled: tt.variablePricingEnabled ?? false,
    ...(tt.pricePhases && tt.pricePhases.length > 0
      ? {
          pricePhases: {
            create: tt.pricePhases.map((p, i) => ({
              price: p.price,
              startsAt: new Date(p.startsAt),
              endsAt: new Date(p.endsAt),
              label: p.label ?? null,
              sortOrder: p.sortOrder ?? i,
            })),
          },
        }
      : {}),
    ...(tt.groupPriceRows && tt.groupPriceRows.length > 0
      ? {
          groupPriceRows: {
            create: tt.groupPriceRows.map((r, i) => ({
              minGuests: r.minGuests,
              maxGuests: r.maxGuests,
              price: r.price,
              sortOrder: r.sortOrder ?? i,
            })),
          },
        }
      : {}),
  };
}

export const ticketTypeInclude = {
  pricePhases: { orderBy: { sortOrder: "asc" as const } },
  groupPriceRows: { orderBy: { sortOrder: "asc" as const } },
  linkedTicketType: { select: { id: true, name: true } },
};
