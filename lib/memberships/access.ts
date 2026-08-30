import { prisma } from "@/lib/db/prisma";

export type MembershipTicketGate = {
  membersOnly?: boolean | null;
  earlyAccessMembersOnly?: boolean | null;
  earlyAccessEndsAt?: Date | string | null;
  salesStartDate?: Date | string | null;
};

export type MembershipAccessResult =
  | { allowed: true; reason?: string }
  | { allowed: false; error: string; code: "MEMBERS_ONLY" | "EARLY_ACCESS" };

function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Comprueba si el usuario tiene membresía ACTIVE en la organización.
 */
export async function hasActiveOrgMembership(
  userId: string | null | undefined,
  organizationId: string | null | undefined
): Promise<boolean> {
  if (!userId || !organizationId) return false;
  const m = await prisma.orgMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return !!m;
}

/**
 * Gating de boletos members-only / early access.
 * - membersOnly: requiere membresía ACTIVE
 * - earlyAccessMembersOnly: antes de earlyAccessEndsAt (o salesStartDate) solo miembros
 */
export async function checkTicketMembershipAccess(params: {
  userId: string | null | undefined;
  organizationId: string | null | undefined;
  ticketType: MembershipTicketGate;
  ticketName?: string;
  now?: Date;
}): Promise<MembershipAccessResult> {
  const {
    userId,
    organizationId,
    ticketType,
    ticketName = "este boleto",
    now = new Date(),
  } = params;

  const isMember = await hasActiveOrgMembership(userId, organizationId);

  if (ticketType.membersOnly) {
    if (!isMember) {
      return {
        allowed: false,
        code: "MEMBERS_ONLY",
        error: `${ticketName} es exclusivo para miembros de la comunidad`,
      };
    }
    return { allowed: true, reason: "members_only_ok" };
  }

  if (ticketType.earlyAccessMembersOnly) {
    const endsAt =
      toDate(ticketType.earlyAccessEndsAt) ||
      toDate(ticketType.salesStartDate);
    if (endsAt && now < endsAt && !isMember) {
      return {
        allowed: false,
        code: "EARLY_ACCESS",
        error: `${ticketName} está en acceso anticipado para miembros`,
      };
    }
  }

  return { allowed: true };
}
