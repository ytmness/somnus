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
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

/**
 * Formatea una fecha a formato legible en español
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Formatea fecha y hora
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
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
