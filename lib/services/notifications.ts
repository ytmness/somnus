import { prisma } from "@/lib/db/prisma";
import type { NotificationType, Prisma } from "@prisma/client";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      linkUrl: input.linkUrl ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function notifyOrganizationFollowers(params: {
  organizationId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const followers = await prisma.organizationFollow.findMany({
    where: { organizationId: params.organizationId },
    select: { userId: true },
  });

  if (followers.length === 0) return 0;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      linkUrl: params.linkUrl ?? null,
      metadata: params.metadata ?? undefined,
    })),
  });

  return followers.length;
}

export async function getOrganizerUserId(organizationId: string): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { organizer: { select: { userId: true } } },
  });
  return org?.organizer?.userId ?? null;
}

/**
 * Notifica a quienes siguen a `followingId` (UserFollow.followerId).
 */
export async function notifyUserFollowers(params: {
  followingId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
  metadata?: Prisma.InputJsonValue;
  /** Excluir estos userIds (p.ej. el propio comprador) */
  excludeUserIds?: string[];
}) {
  const followers = await prisma.userFollow.findMany({
    where: { followingId: params.followingId },
    select: { followerId: true },
  });

  const exclude = new Set(params.excludeUserIds ?? []);
  const recipients = followers
    .map((f) => f.followerId)
    .filter((id) => !exclude.has(id));

  if (recipients.length === 0) return 0;

  await prisma.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      linkUrl: params.linkUrl ?? null,
      metadata: params.metadata ?? undefined,
    })),
  });

  return recipients.length;
}
