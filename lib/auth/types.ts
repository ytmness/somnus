import type { StaffRole, MembershipScope } from "@prisma/client";

export interface StaffMembershipSummary {
  id: string;
  role: StaffRole;
  scope: MembershipScope;
  organizerId: string | null;
  organizationId: string | null;
  venueId: string | null;
  eventId: string | null;
  tableNumber: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "ORGANIZER" | "VENDEDOR" | "SUPERVISOR" | "ACCESOS" | "CLIENTE";
  /** @deprecated Mantener vacío para compatibilidad; ya no hay Supabase Auth */
  authUserId: string;
  memberships?: StaffMembershipSummary[];
  staffRoles?: StaffRole[];
}

export function hasRole(
  user: SessionUser | null,
  allowedRoles: SessionUser["role"][]
): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
