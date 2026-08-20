/** Resolved sales window for a ticket type (tier overrides event when set). */
export type SalesWindowSource = {
  salesStartDate?: Date | string | null;
  salesEndDate?: Date | string | null;
};

export type EventSalesWindow = {
  salesStartDate: Date | string;
  salesEndDate: Date | string;
};

function toMs(v: Date | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

/** Effective start/end: tier date if set, otherwise event date. */
export function effectiveSalesWindow(
  event: EventSalesWindow,
  ticketType: SalesWindowSource
): { start: number | null; end: number | null } {
  const start =
    toMs(ticketType.salesStartDate) ?? toMs(event.salesStartDate);
  const end = toMs(ticketType.salesEndDate) ?? toMs(event.salesEndDate);
  return { start, end };
}

export type SalesOpenStatus = "open" | "not_started" | "ended";

export function salesOpenStatus(
  event: EventSalesWindow,
  ticketType: SalesWindowSource,
  at: Date = new Date()
): SalesOpenStatus {
  const { start, end } = effectiveSalesWindow(event, ticketType);
  const t = at.getTime();
  if (start != null && t < start) return "not_started";
  if (end != null && t > end) return "ended";
  return "open";
}

export function isSalesOpen(
  event: EventSalesWindow,
  ticketType: SalesWindowSource,
  at: Date = new Date()
): boolean {
  return salesOpenStatus(event, ticketType, at) === "open";
}

/** Aggregate purchase state for visible ticket types on an event page. */
export function eventTicketPurchaseState(
  event: EventSalesWindow & {
    ticketTypes: Array<
      SalesWindowSource & {
        maxQuantity: number;
        soldQuantity?: number;
        manualSoldOut?: boolean;
      }
    >;
  },
  at: Date = new Date()
): {
  hasAnyTickets: boolean;
  allSoldOut: boolean;
  allSalesClosed: boolean;
  anyPurchasable: boolean;
  ctaLabel: string;
  ctaDisabled: boolean;
} {
  const types = event.ticketTypes;
  const hasAnyTickets = types.length > 0;
  if (!hasAnyTickets) {
    return {
      hasAnyTickets: false,
      allSoldOut: false,
      allSalesClosed: false,
      anyPurchasable: false,
      ctaLabel: "Buy tickets",
      ctaDisabled: true,
    };
  }

  const soldOut = (tt: (typeof types)[number]) =>
    tt.manualSoldOut ||
    tt.maxQuantity - (tt.soldQuantity || 0) <= 0;

  const status = (tt: (typeof types)[number]) =>
    salesOpenStatus(event, tt, at);

  const purchasable = types.filter(
    (tt) => !soldOut(tt) && status(tt) === "open"
  );
  const allSoldOut = types.every(soldOut);
  const allSalesClosed =
    !allSoldOut &&
    types.every((tt) => soldOut(tt) || status(tt) !== "open");
  const anyPurchasable = purchasable.length > 0;

  let ctaLabel = "Buy tickets";
  let ctaDisabled = false;
  if (allSoldOut) {
    ctaLabel = "Sold out";
    ctaDisabled = true;
  } else if (allSalesClosed) {
    const anyNotStarted = types.some(
      (tt) => !soldOut(tt) && status(tt) === "not_started"
    );
    ctaLabel = anyNotStarted ? "Sales not open yet" : "Sales closed";
    ctaDisabled = true;
  }

  return {
    hasAnyTickets,
    allSoldOut,
    allSalesClosed,
    anyPurchasable,
    ctaLabel,
    ctaDisabled,
  };
}
