import type { TicketCategory } from "@prisma/client";

/** Fila de fase (DB o JSON) */
export type TicketPricePhaseRow = {
  startsAt: Date | string;
  endsAt: Date | string;
  price: unknown;
  sortOrder?: number;
};

/**
 * Precio vigente: si `at` cae en una fase, usa su precio; si no, el precio base.
 * Rangos inclusivos en ambos extremos [startsAt, endsAt].
 * Si hay solapamiento, gana la fase con menor `sortOrder` y luego la primera en el tiempo.
 */
export function effectiveTicketPriceAt(
  basePrice: number,
  phases: TicketPricePhaseRow[] | null | undefined,
  at: Date = new Date()
): number {
  const base = Math.round(basePrice * 100) / 100;
  if (!phases?.length) return base;

  const t = at.getTime();
  const sorted = [...phases].sort((a, b) => {
    const o = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (o !== 0) return o;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });

  for (const p of sorted) {
    const s = new Date(p.startsAt).getTime();
    const e = new Date(p.endsAt).getTime();
    if (t >= s && t <= e) {
      const n = Number(p.price);
      if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100;
    }
  }
  return base;
}

/** Mínimo para calcular el importe por cupo en links de mesa (igual que venta general). */
export type TicketForGeneralPrice = {
  isTable: boolean;
  category: TicketCategory;
  price: unknown;
  isActive?: boolean;
  pricePhases?: TicketPricePhaseRow[] | null;
};

/**
 * Precio unitario del “general” del evento: tipos no-mesa categoría GENERAL;
 * si no hay, el más barato entre tipos no-mesa activos.
 * Respeta fases de precio a la fecha `at`.
 */
export function generalAdmissionUnitPrice(
  ticketTypes: TicketForGeneralPrice[],
  at: Date = new Date()
): number | null {
  const rows = ticketTypes.filter((tt) => tt.isActive !== false);
  const general = rows.filter((tt) => !tt.isTable && tt.category === "GENERAL");
  const pool = general.length > 0 ? general : rows.filter((tt) => !tt.isTable);
  if (pool.length === 0) return null;

  const effectivePrices = pool.map((t) =>
    effectiveTicketPriceAt(Number(t.price), t.pricePhases ?? null, at)
  );
  const ok = effectivePrices.filter((n) => Number.isFinite(n) && n > 0);
  if (ok.length === 0) return null;
  return Math.round(Math.min(...ok) * 100) / 100;
}

export type GroupPriceRow = {
  minGuests: number;
  maxGuests: number;
  price: unknown;
};

/** Resolve table price from group size when variable pricing is enabled. */
export function priceForGuestCount(
  basePrice: number,
  rows: GroupPriceRow[] | null | undefined,
  guestCount: number,
  variableEnabled: boolean
): number {
  if (!variableEnabled || !rows?.length) {
    return Math.round(basePrice * 100) / 100;
  }
  const match = rows.find(
    (r) => guestCount >= r.minGuests && guestCount <= r.maxGuests
  );
  if (!match) return Math.round(basePrice * 100) / 100;
  const n = Number(match.price);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : Math.round(basePrice * 100) / 100;
}
