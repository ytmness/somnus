import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/session";
import { orgPostSchema } from "@/lib/validations/schemas";
import { userOwnsOrganization } from "@/lib/auth/event-access";
import { notifyOrganizationFollowers } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/organizations/[id]/posts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const org = await prisma.organization.findFirst({
      where: { id: params.id, isActive: true },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const [posts, total] = await Promise.all([
      prisma.organizationPost.findMany({
        where: { organizationId: params.id, isPublished: true },
        include: {
          author: { select: { id: true, name: true } },
          organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.organizationPost.count({
        where: { organizationId: params.id, isPublished: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET org posts error:", error);
    return NextResponse.json({ error: "Error al obtener publicaciones" }, { status: 500 });
  }
}

/**
 * POST /api/organizations/[id]/posts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN", "ORGANIZER"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const owns = await userOwnsOrganization(user!, params.id);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const result = orgPostSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: params.id },
      select: { name: true, slug: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const { content, imageUrl, type, notifyFollowers } = result.data;
    const shouldNotify = notifyFollowers || type === "ANNOUNCEMENT";

    const post = await prisma.organizationPost.create({
      data: {
        organizationId: params.id,
        authorUserId: user!.id,
        content,
        imageUrl: imageUrl || null,
        type: type ?? "POST",
        notifyFollowers: shouldNotify,
      },
      include: {
        author: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });

    if (shouldNotify) {
      await notifyOrganizationFollowers({
        organizationId: params.id,
        type: type === "ANNOUNCEMENT" ? "ORG_ANNOUNCEMENT" : "NEW_POST",
        title: type === "ANNOUNCEMENT" ? `${org.name} — Anuncio` : `Nueva publicación de ${org.name}`,
        body: content.slice(0, 120),
        linkUrl: `/organizaciones/${org.slug}`,
        metadata: { organizationId: params.id, postId: post.id },
      });
    }

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error) {
    console.error("POST org post error:", error);
    return NextResponse.json({ error: "Error al crear publicación" }, { status: 500 });
  }
}
