/**
 * Lógica de registro público.
 * Todos los registros públicos son ORGANIZER en backend (marketplace).
 * El frontend trata a todos como compradores; publicar eventos es opt-in.
 */

export function resolvePublicRegistrationRole(): "ORGANIZER" {
  return "ORGANIZER";
}

export function resolvePostAuthRedirect(
  role: string,
  staffRoles?: string[]
): string {
  if (role === "ADMIN") return "/admin";
  if (staffRoles?.includes("VENDEDOR") || role === "VENDEDOR") return "/";
  if (staffRoles?.includes("SUPERVISOR") || role === "SUPERVISOR")
    return "/";
  if (staffRoles?.includes("ACCESOS") || role === "ACCESOS") return "/accesos";
  if (role === "ORGANIZER") return "/organizador";
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
