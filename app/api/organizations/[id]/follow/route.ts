import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { createNotification, getOrganizerUserId } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/organizations/[id]/follow
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const org = await prisma.organization.findFirst({
      where: { id: params.id, isActive: true },
      select: { id: true, name: true, slug: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const existing = await prisma.organizationFollow.findUnique({
      where: {
        userId_organizationId: { userId: user.id, organizationId: org.id },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, data: { following: true } });
    }

    await prisma.organizationFollow.create({
      data: { userId: user.id, organizationId: org.id },
    });

    const organizerUserId = await getOrganizerUserId(org.id);
    if (organizerUserId && organizerUserId !== user.id) {
      await createNotification({
        userId: organizerUserId,
        type: "NEW_FOLLOWER",
        title: "Nuevo seguidor",
        body: `${user.name} empezó a seguir ${org.name}`,
        linkUrl: `/organizaciones/${org.slug}`,
        metadata: { organizationId: org.id, followerUserId: user.id },
      });
    }

    const count = await prisma.organizationFollow.count({
      where: { organizationId: org.id },
    });

    return NextResponse.json({ success: true, data: { following: true, followersCount: count } });
  } catch (error) {
    console.error("POST follow error:", error);
    return NextResponse.json({ error: "Error al seguir organización" }, { status: 500 });
  }
}

/**
 * DELETE /api/organizations/[id]/follow
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    await prisma.organizationFollow.deleteMany({
      where: { userId: user.id, organizationId: params.id },
    });

    const count = await prisma.organizationFollow.count({
      where: { organizationId: params.id },
    });

    return NextResponse.json({ success: true, data: { following: false, followersCount: count } });
  } catch (error) {
    console.error("DELETE follow error:", error);
    return NextResponse.json({ error: "Error al dejar de seguir" }, { status: 500 });
  }
}
