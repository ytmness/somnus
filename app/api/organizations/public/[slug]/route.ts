import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/organizations/public/[slug]
 * Perfil público de organización
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getSession();

    const org = await prisma.organization.findFirst({
      where: { slug: params.slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        websiteUrl: true,
        instagramUrl: true,
        city: true,
        isVerified: true,
        createdAt: true,
        organizer: { select: { businessName: true } },
        _count: { select: { followers: true, posts: true, events: true } },
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    let isFollowing = false;
    if (user) {
      const follow = await prisma.organizationFollow.findUnique({
        where: {
          userId_organizationId: { userId: user.id, organizationId: org.id },
        },
      });
      isFollowing = !!follow;
    }

    return NextResponse.json({
      success: true,
      data: { ...org, isFollowing },
    });
  } catch (error) {
    console.error("GET public org profile error:", error);
    return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}
