import { prisma } from "@/lib/db/prisma";
import { syncOrganizerStripeStatus } from "@/lib/payments/connect";
import type { SessionUser } from "@/lib/auth/supabase-auth";

export async function getOrganizerForUser(userId: string) {
  return prisma.organizer.findUnique({
    where: { userId },
    include: {
      organizations: { where: { isActive: true }, orderBy: { name: "asc" } },
    },
  });
}

export async function ensureOrganizerProfile(user: SessionUser) {
  let organizer = await prisma.organizer.findUnique({
    where: { userId: user.id },
  });

  if (!organizer) {
    organizer = await prisma.organizer.create({
      data: {
        userId: user.id,
        businessName: user.name || user.email.split("@")[0],
        contactEmail: user.email,
      },
    });
  }

  return organizer;
}

export async function assertOrganizerCanCreateEvents(userId: string): Promise<
  | { ok: true; organizer: NonNullable<Awaited<ReturnType<typeof getOrganizerForUser>>> }
  | { ok: false; code: "ORG_REQUIRED" | "STRIPE_REQUIRED"; message: string }
> {
  const organizer = await getOrganizerForUser(userId);

  if (!organizer) {
    return {
      ok: false,
      code: "ORG_REQUIRED",
      message: "Debes crear al menos una organización antes de publicar eventos.",
    };
  }

  if (!organizer.organizations.length) {
    return {
      ok: false,
      code: "ORG_REQUIRED",
      message: "Debes crear al menos una organización antes de publicar eventos.",
    };
  }

  if (!organizer.stripeAccountId) {
    return {
      ok: false,
      code: "STRIPE_REQUIRED",
      message: "Conecta tu cuenta de Stripe antes de crear eventos.",
    };
  }

  const status = await syncOrganizerStripeStatus(organizer.id);
  if (!status.isReady) {
    return {
      ok: false,
      code: "STRIPE_REQUIRED",
      message: "Completa la configuración de Stripe antes de crear eventos.",
    };
  }

  return { ok: true, organizer };
}

export async function userOwnsEvent(
  user: SessionUser,
  eventId: string
): Promise<boolean> {
  if (user.role === "ADMIN") return true;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizer: { select: { userId: true } } },
  });

  return event?.organizer?.userId === user.id;
}

export async function userOwnsOrganization(
  user: SessionUser,
  organizationId: string
): Promise<boolean> {
  if (user.role === "ADMIN") return true;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { organizer: { select: { userId: true } } },
  });

  return org?.organizer?.userId === user.id;
}
