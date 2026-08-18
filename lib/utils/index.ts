import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind CSS de manera eficiente
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un número como moneda MXN
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

/**
 * Formatea una fecha a formato legible en español
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Fecha del **evento** tal como se guardó (día calendario en UTC).
 * Evita mostrar un día menos en MX/LATAM: `eventDate` viene como medianoche UTC
 * del día elegido en el admin (`type="date"`), y `formatDate` local lo corría a "ayer".
 */
export function formatEventCalendarDate(
  date: Date | string,
  locale = "en-US"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/** YYYY-MM-DD del día de evento según UTC (coincide con el date picker del admin). */
export function eventCalendarKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD de "hoy" en la zona local del usuario. */
export function localTodayCalendarKey(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const day = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** El evento ya pasó comparando solo días (calendario evento UTC vs hoy local). */
export function isEventPastByCalendar(iso: string | Date): boolean {
  return eventCalendarKey(iso) < localTodayCalendarKey();
}

/**
 * Formatea fecha y hora
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Genera un número de folio único incremental
 */
export function generateTicketNumber(eventId: string, sequenceNumber: number): string {
  const eventPrefix = eventId.slice(0, 4).toUpperCase();
  const paddedNumber = String(sequenceNumber).padStart(6, "0");
  return `${eventPrefix}-${paddedNumber}`;
}

/**
 * Calcula el IVA (16% en México)
 */
export function calculateTax(subtotal: number): number {
  const TAX_RATE = 0.16;
  return subtotal * TAX_RATE;
}

/**
 * Calcula el total con IVA
 */
export function calculateTotal(subtotal: number): number {
  return subtotal + calculateTax(subtotal);
}

/**
 * Cargo de servicio de pasarela (lo paga el cliente).
 * Cubre comisión estimada Stripe MX sobre el total (3.6% + $3 + IVA 16%) + $1 colchón.
 * F = stripe(S+F) + buffer  →  F = (stripeFactor*S + fixed*(1+IVA) + buffer) / (1 - stripeFactor)
 */
const STRIPE_PCT = 0.036;
const STRIPE_FIXED_MXN = 3;
const IVA_RATE = 0.16;
const PLATFORM_BUFFER_MXN = 1;

/**
 * Calcula el cargo de servicio que absorbe Stripe + colchón de plataforma.
 * `totalCommission` es lo cobrado al cliente; base/IVA desglosan el estimado Stripe.
 */
export function calculateServiceFee(subtotal: number): {
  commissionBase: number;
  ivaOnCommission: number;
  totalCommission: number;
} {
  const s = Math.max(0, Number(subtotal) || 0);
  const stripeFactor = STRIPE_PCT * (1 + IVA_RATE);
  const denom = 1 - stripeFactor;
  const numerator =
    stripeFactor * s + STRIPE_FIXED_MXN * (1 + IVA_RATE) + PLATFORM_BUFFER_MXN;
  const totalCommission = Math.round((numerator / denom) * 100) / 100;

  const totalForStripe = s + totalCommission;
  const stripePreTax = STRIPE_PCT * totalForStripe + STRIPE_FIXED_MXN;
  const ivaOnCommission = Math.round(stripePreTax * IVA_RATE * 100) / 100;
  const commissionBase = Math.round(stripePreTax * 100) / 100;

  return { commissionBase, ivaOnCommission, totalCommission };
}

/** @deprecated Usar calculateServiceFee */
export const calculateClipCommission = calculateServiceFee;

/** Total que paga el cliente: subtotal + cargo de servicio. Redondeado a 2 decimales. */
export function calculateTotalWithServiceFee(subtotal: number): number {
  const { totalCommission } = calculateServiceFee(subtotal);
  return Math.round((subtotal + totalCommission) * 100) / 100;
}

/** @deprecated Usar calculateTotalWithServiceFee */
export const calculateTotalWithClipCommission = calculateTotalWithServiceFee;

