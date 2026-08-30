import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { createNotification } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/users/[id]/follow
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

    if (user.id === params.id) {
      return NextResponse.json(
        { error: "No puedes seguirte a ti mismo" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findFirst({
      where: { id: params.id, isActive: true },
      select: { id: true, name: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const existing = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: target.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, data: { following: true } });
    }

    await prisma.userFollow.create({
      data: { followerId: user.id, followingId: target.id },
    });

    await createNotification({
      userId: target.id,
      type: "NEW_USER_FOLLOWER",
      title: "Nuevo seguidor",
      body: `${user.name} empezó a seguirte`,
      linkUrl: `/perfil`,
      metadata: { followerUserId: user.id },
    });

    const count = await prisma.userFollow.count({
      where: { followingId: target.id },
    });

    return NextResponse.json({
      success: true,
      data: { following: true, followersCount: count },
    });
  } catch (error) {
    console.error("POST user follow error:", error);
    return NextResponse.json({ error: "Error al seguir usuario" }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]/follow
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

    await prisma.userFollow.deleteMany({
      where: { followerId: user.id, followingId: params.id },
    });

    const count = await prisma.userFollow.count({
      where: { followingId: params.id },
    });

    return NextResponse.json({
      success: true,
      data: { following: false, followersCount: count },
    });
  } catch (error) {
    console.error("DELETE user follow error:", error);
    return NextResponse.json(
      { error: "Error al dejar de seguir" },
      { status: 500 }
    );
  }
}
