/**
 * Lógica de registro público.
 * Por ahora todos los registros públicos son CLIENTE (comprador).
 * El rol ORGANIZER queda reservado para cuentas elevadas manualmente.
 */

export type AuthSurface = "web" | "app";

export function parseAuthSurface(value: unknown): AuthSurface {
  if (value === "app" || value === 1 || value === "1" || value === true) {
    return "app";
  }
  return "web";
}

export function resolvePublicRegistrationRole(): "CLIENTE" {
  return "CLIENTE";
}

export function resolvePostAuthRedirect(
  role: string,
  staffRoles?: string[],
  surface: AuthSurface = "web"
): string {
  if (role === "ADMIN") return "/admin";
  if (staffRoles?.includes("ACCESOS") || role === "ACCESOS") return "/accesos";
  if (staffRoles?.includes("VENDEDOR") || role === "VENDEDOR") return "/vendedor";
  if (staffRoles?.includes("SUPERVISOR") || role === "SUPERVISOR")
    return "/supervisor";
  // Web (Bubbl-style): compradores aterrizan en landing.
  // App: organizadores van al panel.
  if (role === "ORGANIZER") {
    return surface === "app" ? "/organizador" : "/";
  }
  return "/";
}

export const TICKET_VIEWER_ROLES = new Set([
  "CLIENTE",
  "ORGANIZER",
  "ADMIN",
  "VENDEDOR",
  "SUPERVISOR",
]);

export function canViewOwnTickets(role: string): boolean {
  return TICKET_VIEWER_ROLES.has(role);
}
