import { resolvePostAuthRedirect } from "@/lib/auth/registration";
import {
  getPrimaryStaffRedirect,
  getUserMemberships,
} from "@/lib/auth/permissions";

const ALLOWED_REDIRECT_PREFIXES = [
  "/",
  "/admin",
  "/accesos",
  "/organizador",
  "/mis-boletos",
  "/eventos",
  "/feed",
  "/mensajes",
  "/notificaciones",
  "/organizaciones",
  "/galeria",
  "/vendedor",
  "/supervisor",
  "/checkout",
  "/pago",
  "/pago-exitoso",
  "/invitacion",
  "/mesa",
  "/register",
  "/login",
  "/verificar-email",
  "/auth/post-login",
];

/**
 * Valida el parámetro `next` para evitar open redirects.
 */
export function sanitizeRedirectPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => next === prefix || next.startsWith(`${prefix}/`) || next.startsWith(`${prefix}?`)
  );
  return isAllowed ? next : null;
}

export function resolveAuthRedirectPath(
  role: string,
  requestedNext?: string | null,
  staffRoles?: string[]
): string {
  return sanitizeRedirectPath(requestedNext) ?? resolvePostAuthRedirect(role, staffRoles);
}

/**
 * Resuelve redirect post-auth usando membresías staff cuando no hay `next` explícito.
 */
export async function resolveAuthRedirectForUser(
  userId: string,
  role: string,
  requestedNext?: string | null
): Promise<string> {
  const sanitized = sanitizeRedirectPath(requestedNext);
  if (sanitized) return sanitized;

  const memberships = await getUserMemberships(userId);
  const staffRedirect = getPrimaryStaffRedirect(memberships, role);
  if (staffRedirect) return staffRedirect;

  const staffRoles = memberships.map((m) => m.role);
  return resolvePostAuthRedirect(role, staffRoles);
}
