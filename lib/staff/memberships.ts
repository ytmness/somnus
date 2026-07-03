import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import type { StaffRole, MembershipScope } from "@prisma/client";

export type StaffAssignmentInput = {
  userId: string;
  role: StaffRole;
  scope: MembershipScope;
  organizerId?: string | null;
  organizationId?: string | null;
  venueId?: string | null;
  eventId?: string | null;
  tableNumber?: string | null;
  assignedById?: string | null;
};

export type StaffInviteInput = {
  email: string;
  role: StaffRole;
  scope: MembershipScope;
  organizerId?: string | null;
  organizationId?: string | null;
  venueId?: string | null;
  eventId?: string | null;
  tableNumber?: string | null;
  invitedById: string;
};

export function generateInviteToken(): string {
  return randomBytes(24).toString("hex");
}

export async function createStaffMembership(input: StaffAssignmentInput) {
  const scopeKey = {
    userId: input.userId,
    role: input.role,
    scope: input.scope,
    organizerId: input.organizerId ?? null,
    organizationId: input.organizationId ?? null,
    venueId: input.venueId ?? null,
    eventId: input.eventId ?? null,
    tableNumber: input.tableNumber ?? null,
  };

  const existing = await prisma.staffMembership.findFirst({
    where: scopeKey,
  });

  if (existing) {
    return prisma.staffMembership.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        assignedById: input.assignedById ?? undefined,
      },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    });
  }

  return prisma.staffMembership.create({
    data: {
      userId: input.userId,
      role: input.role,
      scope: input.scope,
      organizerId: input.organizerId ?? undefined,
      organizationId: input.organizationId ?? undefined,
      venueId: input.venueId ?? undefined,
      eventId: input.eventId ?? undefined,
      tableNumber: input.tableNumber ?? undefined,
      assignedById: input.assignedById ?? undefined,
      isActive: true,
    },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });
}

export async function createStaffInvite(input: StaffInviteInput) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return prisma.staffInvite.create({
    data: {
      email: input.email.trim().toLowerCase(),
      role: input.role,
      scope: input.scope,
      organizerId: input.organizerId ?? undefined,
      organizationId: input.organizationId ?? undefined,
      venueId: input.venueId ?? undefined,
      eventId: input.eventId ?? undefined,
      tableNumber: input.tableNumber ?? undefined,
      token: generateInviteToken(),
      invitedById: input.invitedById,
      expiresAt,
    },
  });
}

export async function acceptStaffInvite(token: string, userId: string, email: string) {
  const invite = await prisma.staffInvite.findUnique({ where: { token } });

  if (!invite) {
    return { ok: false as const, error: "Invitación no encontrada" };
  }

  if (invite.acceptedAt) {
    return { ok: false as const, error: "Invitación ya aceptada" };
  }

  if (invite.expiresAt < new Date()) {
    return { ok: false as const, error: "Invitación expirada" };
  }

  if (invite.email !== email.trim().toLowerCase()) {
    return { ok: false as const, error: "El email no coincide con la invitación" };
  }

  const membership = await createStaffMembership({
    userId,
    role: invite.role,
    scope: invite.scope,
    organizerId: invite.organizerId,
    organizationId: invite.organizationId,
    venueId: invite.venueId,
    eventId: invite.eventId,
    tableNumber: invite.tableNumber,
    assignedById: invite.invitedById,
  });

  await prisma.staffInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  return { ok: true as const, membership };
}

export const STAFF_MEMBERSHIP_INCLUDE = {
  user: { select: { id: true, email: true, name: true, role: true, isActive: true } },
  organizer: { select: { id: true, businessName: true } },
  organization: { select: { id: true, name: true } },
  venue: { select: { id: true, name: true } },
  event: { select: { id: true, name: true } },
} as const;
