import { prisma } from "@/lib/db/prisma";
import type {
  BuyerProfileCard,
  PrivateProfile,
  PublicProfile,
} from "@/lib/profile-types";

export type { BuyerProfileCard, PrivateProfile, PublicProfile };

const publicSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  backgroundUrl: true,
  bio: true,
  instagramUsername: true,
  emailVerified: true,
  createdAt: true,
  phone: true,
  email: true,
  smsOptIn: true,
} as const;

function normalizeInstagram(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = raw.trim();
  if (!v) return null;
  v = v.replace(/^@+/, "");
  v = v
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\?.*$/, "");
  v = v.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 64);
  return v || null;
}

export { normalizeInstagram };

export async function buildProfileForUserId(
  userId: string,
  opts?: { includePrivate?: boolean }
): Promise<PublicProfile | PrivateProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicSelect,
  });
  if (!user || !user) return null;

  const [follows, purchases] = await Promise.all([
    prisma.organizationFollow.findMany({
      where: { userId },
      take: 24,
      orderBy: { createdAt: "desc" },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.sale.findMany({
      where: {
        buyerEmail: user.email,
        status: "COMPLETED",
      },
      select: {
        id: true,
        eventId: true,
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            imageUrl: true,
            organization: { select: { logoUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const communities = follows
    .filter((f) => f.organization.isActive)
    .map((f) => ({
      id: f.organization.id,
      name: f.organization.name,
      slug: f.organization.slug,
      logoUrl: f.organization.logoUrl,
    }));

  const seenEvents = new Set<string>();
  const pastEvents: PublicProfile["pastEvents"] = [];
  const now = new Date();
  for (const sale of purchases) {
    if (seenEvents.has(sale.event.id)) continue;
    seenEvents.add(sale.event.id);
    if (new Date(sale.event.eventDate) > now) continue;
    pastEvents.push({
      id: sale.event.id,
      name: sale.event.name,
      eventDate: sale.event.eventDate.toISOString(),
      imageUrl: sale.event.imageUrl,
      organizationLogo: sale.event.organization?.logoUrl ?? null,
    });
    if (pastEvents.length >= 12) break;
  }

  const base: PublicProfile = {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    backgroundUrl: user.backgroundUrl,
    bio: user.bio,
    instagramUsername: user.instagramUsername,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    stats: {
      communities: communities.length,
      pastEvents: pastEvents.length,
      completedPurchases: purchases.length,
    },
    communities,
    pastEvents,
  };

  if (opts?.includePrivate) {
    return {
      ...base,
      email: user.email,
      phone: user.phone,
      smsOptIn: user.smsOptIn,
      isOwn: true,
    };
  }

  return base;
}

/** Compact buyer card for approval queues */
export async function lookupBuyerProfilesByEmails(emails: string[]) {
  const normalized = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  );
  if (normalized.length === 0) return {} as Record<string, Awaited<ReturnType<typeof buyerCard>>>;

  const users = await prisma.user.findMany({
    where: { email: { in: normalized } },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      bio: true,
      instagramUsername: true,
      emailVerified: true,
      smsOptIn: true,
      createdAt: true,
    },
  });

  const byEmail: Record<string, (typeof users)[number]> = {};
  for (const u of users) byEmail[u.email.toLowerCase()] = u;

  const result: Record<string, Awaited<ReturnType<typeof buyerCard>>> = {};
  await Promise.all(
    normalized.map(async (email) => {
      result[email] = await buyerCard(email, byEmail[email] ?? null);
    })
  );
  return result;
}

async function buyerCard(
  email: string,
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    avatarUrl: string | null;
    bio: string | null;
    instagramUsername: string | null;
    emailVerified: boolean;
    smsOptIn: boolean;
    createdAt: Date;
  } | null
) {
  const [completedCount, followsCount] = await Promise.all([
    prisma.sale.count({
      where: { buyerEmail: email, status: "COMPLETED" },
    }),
    user
      ? prisma.organizationFollow.count({ where: { userId: user.id } })
      : Promise.resolve(0),
  ]);

  return {
    hasAccount: Boolean(user),
    userId: user?.id ?? null,
    name: user?.name ?? null,
    email,
    phone: user?.phone ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    bio: user?.bio ?? null,
    instagramUsername: user?.instagramUsername ?? null,
    emailVerified: user?.emailVerified ?? false,
    smsOptIn: user?.smsOptIn ?? false,
    memberSince: user?.createdAt?.toISOString() ?? null,
    completedPurchases: completedCount,
    communities: followsCount,
  };
}
