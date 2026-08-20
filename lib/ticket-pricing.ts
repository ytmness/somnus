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

export function isMesaTicketType(tt: {
  kind?: string | null;
  isTable?: boolean | null;
}): boolean {
  return tt.kind === "TABLE" || tt.isTable === true;
}

export type TicketForInviteAnchor = {
  id?: string;
  name?: string | null;
  kind?: string | null;
  isTable: boolean;
  category: TicketCategory;
  price: unknown;
  isActive?: boolean;
  isHidden?: boolean;
  pricePhases?: TicketPricePhaseRow[] | null;
};

export type InvitePoolTicketOption<T extends TicketForInviteAnchor> = {
  ticket: T;
  unitPrice: number;
};

/** Tipos que un link de mesa puede vender: TABLE, o generales si el evento no tiene mesas. */
export function listInvitePoolTicketTypes<T extends TicketForInviteAnchor>(
  ticketTypes: T[],
  at: Date = new Date()
): InvitePoolTicketOption<T>[] {
  const rows = ticketTypes.filter(
    (tt) => tt.isActive !== false && !tt.isHidden
  );
  const tables = rows.filter(isMesaTicketType);
  const pool =
    tables.length > 0
      ? tables
      : (() => {
          const general = rows.filter(
            (tt) => !isMesaTicketType(tt) && tt.category === "GENERAL"
          );
          return general.length > 0
            ? general
            : rows.filter((tt) => !isMesaTicketType(tt));
        })();

  const out: InvitePoolTicketOption<T>[] = [];
  for (const ticket of pool) {
    const unitPrice = effectiveTicketPriceAt(
      Number(ticket.price),
      ticket.pricePhases ?? null,
      at
    );
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) continue;
    out.push({ ticket, unitPrice });
  }
  return out;
}

export function resolveInvitePoolTicket<T extends TicketForInviteAnchor>(
  ticketTypes: T[],
  ticketTypeId: string | null | undefined,
  at: Date = new Date()
): InvitePoolTicketOption<T> | null {
  const listed = listInvitePoolTicketTypes(ticketTypes, at);
  if (listed.length === 0) return null;
  const wanted = (ticketTypeId || "").trim();
  if (wanted) {
    return listed.find((row) => row.ticket.id === wanted) ?? null;
  }
  if (listed.length === 1) return listed[0];
  return null;
}

/**
 * Precio ancla del link de mesa: tipos TABLE (o isTable legado).
 * Si el evento no tiene mesas, cae al general más barato (links viejos).
 */
export function pickInvitePoolAnchor<T extends TicketForInviteAnchor>(
  ticketTypes: T[],
  at: Date = new Date()
): InvitePoolTicketOption<T> | null {
  const listed = listInvitePoolTicketTypes(ticketTypes, at);
  if (listed.length === 0) return null;
  return listed.reduce((best, cur) =>
    cur.unitPrice < best.unitPrice ? cur : best
  );
}

export function invitePoolUnitPrice(
  ticketTypes: TicketForInviteAnchor[],
  at: Date = new Date()
): number | null {
  return pickInvitePoolAnchor(ticketTypes, at)?.unitPrice ?? null;
}

/** @deprecated Usa invitePoolUnitPrice: el link de mesa ancla en TABLE, no en General. */
export function generalAdmissionUnitPrice(
  ticketTypes: TicketForInviteAnchor[],
  at: Date = new Date()
): number | null {
  return invitePoolUnitPrice(ticketTypes, at);
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
