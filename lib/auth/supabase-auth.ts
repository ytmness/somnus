/**
 * Re-export de compatibilidad: migrar imports a @/lib/auth/session
 */
export {
  getSession,
  hasRole,
  signOut,
  createServerClient,
  getSupabaseAdmin,
} from "@/lib/auth/session";
export type { SessionUser, StaffMembershipSummary } from "@/lib/auth/session";
