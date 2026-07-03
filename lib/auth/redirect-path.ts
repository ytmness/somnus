import { resolvePostAuthRedirect } from "@/lib/auth/registration";

const ALLOWED_REDIRECT_PREFIXES = [
  "/",
  "/admin",
  "/accesos",
  "/organizador",
  "/mis-boletos",
  "/eventos",
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
  requestedNext?: string | null
): string {
  return sanitizeRedirectPath(requestedNext) ?? resolvePostAuthRedirect(role);
}
