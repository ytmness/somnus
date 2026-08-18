import {
  parseAuthSurface,
  resolvePostAuthRedirect,
  type AuthSurface,
} from "@/lib/auth/registration";
import {
  getPrimaryStaffRedirect,
  getUserMemberships,
} from "@/lib/auth/permissions";

export type { AuthSurface };
export { parseAuthSurface };

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
  staffRoles?: string[],
  surface: AuthSurface = "web"
): string {
  return (
    sanitizeRedirectPath(requestedNext) ??
    resolvePostAuthRedirect(role, staffRoles, surface)
  );
}

/**
 * Resuelve redirect post-auth usando membresías staff cuando no hay `next` explícito.
 */
export async function resolveAuthRedirectForUser(
  userId: string,
  role: string,
  requestedNext?: string | null,
  surface: AuthSurface = "web"
): Promise<string> {
  const sanitized = sanitizeRedirectPath(requestedNext);
  if (sanitized) return sanitized;

  const memberships = await getUserMemberships(userId);
  const staffRedirect = getPrimaryStaffRedirect(memberships, role, surface);
  if (staffRedirect) return staffRedirect;

  const staffRoles = memberships.map((m) => m.role);
  return resolvePostAuthRedirect(role, staffRoles, surface);
}
