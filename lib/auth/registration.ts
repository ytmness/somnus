/**
 * Lógica de registro público.
 * Todos los registros públicos son ORGANIZER en backend (marketplace).
 * El frontend trata a todos como compradores; publicar eventos es opt-in.
 */

export function resolvePublicRegistrationRole(): "ORGANIZER" {
  return "ORGANIZER";
}

export function resolvePostAuthRedirect(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "VENDEDOR") return "/vendedor";
  if (role === "SUPERVISOR") return "/supervisor";
  if (role === "ACCESOS") return "/accesos";
  // ORGANIZER, CLIENTE y usuarios normales → home
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
