import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/supabase-auth";

export const dynamic = "force-dynamic";

type FeedItem =
  | {
      kind: "post";
      id: string;
      createdAt: Date;
      post: {
        id: string;
        content: string;
        imageUrl: string | null;
        type: string;
        createdAt: Date;
        organization: {
          id: string;
          name: string;
          slug: string;
          logoUrl: string | null;
        };
        author: { id: string; name: string };
      };
    }
  | {
      kind: "event";
      id: string;
      createdAt: Date;
      event: {
        id: string;
        name: string;
        artist: string;
        venue: string;
        eventDate: Date;
        eventTime: string;
        imageUrl: string | null;
        organization: { id: string; name: string; slug: string; logoUrl: string | null } | null;
      };
    };

/**
 * GET /api/feed/following
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const follows = await prisma.organizationFollow.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });

    const orgIds = follows.map((f) => f.organizationId);
    if (orgIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    const [posts, events] = await Promise.all([
      prisma.organizationPost.findMany({
        where: { organizationId: { in: orgIds }, isPublished: true },
        include: {
          author: { select: { id: true, name: true } },
          organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit * 2,
      }),
      prisma.event.findMany({
        where: { organizationId: { in: orgIds }, isActive: true },
        include: {
          organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit * 2,
      }),
    ]);

    const feed: FeedItem[] = [
      ...posts.map((post) => ({
        kind: "post" as const,
        id: `post-${post.id}`,
        createdAt: post.createdAt,
        post,
      })),
      ...events.map((event) => ({
        kind: "event" as const,
        id: `event-${event.id}`,
        createdAt: event.createdAt,
        event: {
          id: event.id,
          name: event.name,
          artist: event.artist,
          venue: event.venue,
          eventDate: event.eventDate,
          eventTime: event.eventTime,
          imageUrl: event.imageUrl,
          organization: event.organization,
        },
      })),
    ];

    feed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const skip = (page - 1) * limit;
    const paginated = feed.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: {
        page,
        limit,
        total: feed.length,
        pages: Math.ceil(feed.length / limit),
      },
    });
  } catch (error) {
    console.error("GET following feed error:", error);
    return NextResponse.json({ error: "Error al obtener feed" }, { status: 500 });
  }
}
