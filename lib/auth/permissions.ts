import { prisma } from "@/lib/db/prisma";
import type { StaffRole, MembershipScope } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/supabase-auth";

export type StaffMembershipInfo = {
  id: string;
  role: StaffRole;
  scope: MembershipScope;
  organizerId: string | null;
  organizationId: string | null;
  venueId: string | null;
  eventId: string | null;
  tableNumber: string | null;
};

export type PermissionContext = {
  eventId?: string;
  venueId?: string;
  organizerId?: string;
  organizationId?: string;
  tableNumber?: string;
};

const LEGACY_STAFF_ROLE_MAP: Record<string, StaffRole> = {
  VENDEDOR: "VENDEDOR",
  SUPERVISOR: "SUPERVISOR",
  ACCESOS: "ACCESOS",
};

const SCOPE_RANK: Record<MembershipScope, number> = {
  PLATFORM: 6,
  ORGANIZER: 5,
  ORGANIZATION: 4,
  VENUE: 3,
  EVENT: 2,
  TABLE: 1,
};

export async function getUserMemberships(
  userId: string
): Promise<StaffMembershipInfo[]> {
  const rows = await prisma.staffMembership.findMany({
    where: { userId, isActive: true },
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
  return rows;
}

async function resolveEventContext(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      organizerId: true,
      organizationId: true,
      venueId: true,
    },
  });
}

function membershipCoversContext(
  m: StaffMembershipInfo,
  ctx: PermissionContext,
  eventMeta?: {
    organizerId: string | null;
    organizationId: string | null;
    venueId: string | null;
  } | null
): boolean {
  switch (m.scope) {
    case "PLATFORM":
      return true;
    case "ORGANIZER":
      if (ctx.organizerId) return m.organizerId === ctx.organizerId;
      if (eventMeta?.organizerId) return m.organizerId === eventMeta.organizerId;
      return false;
    case "ORGANIZATION":
      if (ctx.organizationId) return m.organizationId === ctx.organizationId;
      if (eventMeta?.organizationId)
        return m.organizationId === eventMeta.organizationId;
      return false;
    case "VENUE":
      if (ctx.venueId) return m.venueId === ctx.venueId;
      if (eventMeta?.venueId) return m.venueId === eventMeta.venueId;
      return false;
    case "EVENT":
      return !!ctx.eventId && m.eventId === ctx.eventId;
    case "TABLE":
      return (
        !!ctx.eventId &&
        m.eventId === ctx.eventId &&
        !!ctx.tableNumber &&
        m.tableNumber === ctx.tableNumber
      );
    default:
      return false;
  }
}

export async function hasStaffRole(
  user: SessionUser | null,
  roles: StaffRole[],
  context?: PermissionContext,
  memberships?: StaffMembershipInfo[]
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  const legacyRole = LEGACY_STAFF_ROLE_MAP[user.role];
  if (legacyRole && roles.includes(legacyRole)) {
    if (!context?.eventId) return true;
  }

  const userMemberships =
    memberships ?? (await getUserMemberships(user.id));

  if (userMemberships.length === 0) {
    if (legacyRole && roles.includes(legacyRole)) return true;
    return false;
  }

  let eventMeta: Awaited<ReturnType<typeof resolveEventContext>> = null;
  if (context?.eventId) {
    eventMeta = await resolveEventContext(context.eventId);
  }

  return userMemberships.some(
    (m) =>
      roles.includes(m.role) &&
      (!context || membershipCoversContext(m, context, eventMeta))
  );
}

export async function canScanTickets(
  user: SessionUser | null,
  eventId?: string
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "ACCESOS" && !eventId) return true;

  return hasStaffRole(user, ["ACCESOS"], eventId ? { eventId } : undefined);
}

export async function canSellTickets(
  user: SessionUser | null,
  eventId: string
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "VENDEDOR") return true;

  if (user.role === "ORGANIZER") {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizer: { select: { userId: true } } },
    });
    if (event?.organizer?.userId === user.id) return true;
  }

  return hasStaffRole(user, ["VENDEDOR"], { eventId });
}

export async function canViewReports(
  user: SessionUser | null,
  context?: PermissionContext
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "SUPERVISOR") return true;

  if (user.role === "ORGANIZER" && context?.organizerId) {
    const org = await prisma.organizer.findFirst({
      where: { id: context.organizerId, userId: user.id },
    });
    if (org) return true;
  }

  return hasStaffRole(user, ["SUPERVISOR"], context);
}

export async function canManageTable(
  user: SessionUser | null,
  eventId: string,
  tableNumber: string
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizer: { select: { userId: true } } },
  });
  if (event?.organizer?.userId === user.id) return true;

  return hasStaffRole(user, ["MESA_HOST"], { eventId, tableNumber });
}

export async function canManageTeam(
  actor: SessionUser | null,
  target: { scope: MembershipScope; organizerId?: string | null }
): Promise<boolean> {
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;

  if (target.scope === "PLATFORM") return false;

  if (actor.role === "ORGANIZER" && target.organizerId) {
    const org = await prisma.organizer.findFirst({
      where: { id: target.organizerId, userId: actor.id },
    });
    return !!org;
  }

  return false;
}

export async function getAccessibleEventIds(
  user: SessionUser | null
): Promise<string[] | "all"> {
  if (!user) return [];
  if (user.role === "ADMIN") return "all";

  const eventIds = new Set<string>();

  if (user.role === "ORGANIZER") {
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id },
      select: { events: { select: { id: true } } },
    });
    organizer?.events.forEach((e) => eventIds.add(e.id));
  }

  const memberships = await getUserMemberships(user.id);

  for (const m of memberships) {
    if (m.scope === "PLATFORM") return "all";

    if (m.scope === "EVENT" && m.eventId) {
      eventIds.add(m.eventId);
    } else if (m.scope === "TABLE" && m.eventId) {
      eventIds.add(m.eventId);
    } else if (m.scope === "VENUE" && m.venueId) {
      const events = await prisma.event.findMany({
        where: { venueId: m.venueId },
        select: { id: true },
      });
      events.forEach((e) => eventIds.add(e.id));
    } else if (m.scope === "ORGANIZATION" && m.organizationId) {
      const events = await prisma.event.findMany({
        where: { organizationId: m.organizationId },
        select: { id: true },
      });
      events.forEach((e) => eventIds.add(e.id));
    } else if (m.scope === "ORGANIZER" && m.organizerId) {
      const events = await prisma.event.findMany({
        where: { organizerId: m.organizerId },
        select: { id: true },
      });
      events.forEach((e) => eventIds.add(e.id));
    }
  }

  if (user.role === "ACCESOS" || user.role === "VENDEDOR" || user.role === "SUPERVISOR") {
    if (memberships.length === 0) {
      const allEvents = await prisma.event.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      allEvents.forEach((e) => eventIds.add(e.id));
    }
  }

  return Array.from(eventIds);
}

export function getPrimaryStaffRedirect(
  memberships: StaffMembershipInfo[],
  platformRole: string
): string | null {
  if (platformRole === "ADMIN") return "/admin";

  const rolePriority: StaffRole[] = [
    "VENDEDOR",
    "SUPERVISOR",
    "ACCESOS",
    "VENUE_MANAGER",
    "MESA_HOST",
  ];

  for (const role of rolePriority) {
    if (memberships.some((m) => m.role === role)) {
      if (role === "VENDEDOR") return "/vendedor";
      if (role === "SUPERVISOR") return "/supervisor";
      if (role === "ACCESOS") return "/accesos";
      if (role === "VENUE_MANAGER") return "/organizador";
      if (role === "MESA_HOST") return "/accesos";
    }
  }

  const legacy = LEGACY_STAFF_ROLE_MAP[platformRole];
  if (legacy) {
    if (legacy === "VENDEDOR") return "/vendedor";
    if (legacy === "SUPERVISOR") return "/supervisor";
    if (legacy === "ACCESOS") return "/accesos";
  }

  if (platformRole === "ORGANIZER") return "/organizador";
  return null;
}

export function getActiveStaffRoles(
  memberships: StaffMembershipInfo[],
  platformRole: string
): StaffRole[] {
  const roles = new Set<StaffMembershipInfo["role"]>(
    memberships.map((m) => m.role)
  );
  const legacy = LEGACY_STAFF_ROLE_MAP[platformRole];
  if (legacy) roles.add(legacy);
  return Array.from(roles);
}
