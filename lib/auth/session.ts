import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { SessionUser, StaffMembershipSummary } from "@/lib/auth/types";
import { hasRole } from "@/lib/auth/types";

export type { SessionUser, StaffMembershipSummary };
export { hasRole };

/**
 * Obtiene el usuario actual desde Auth.js + tabla User de Prisma.
 * Misma firma pública que el antiguo getSession de Supabase.
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const session = await auth();
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) return null;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) return null;

    const memberships = await prisma.staffMembership.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        id: true,
        role: true,
        scope: true,
        organizerId: true,
        organizationId: true,
        venueId: true,
        eventId: true,
        tableNumber: true,
      },
    });

    const staffRoles = Array.from(new Set(memberships.map((m) => m.role)));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as SessionUser["role"],
      authUserId: user.id,
      memberships,
      staffRoles,
    };
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/** @deprecated No-op; Auth.js maneja el sign-out vía /api/auth/logout */
export async function signOut() {
  // Las rutas usan signOut de next-auth directamente
}

/** @deprecated Ya no hay cliente Supabase */
export function createServerClient(): never {
  throw new Error(
    "createServerClient (Supabase) eliminado. Usa getSession() o auth() de Auth.js."
  );
}

/** @deprecated Ya no hay admin de Supabase */
export function getSupabaseAdmin(): never {
  throw new Error("getSupabaseAdmin eliminado. Supabase ya no se usa.");
}
