import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { orgPostSchema } from "@/lib/validations/schemas";
import { userOwnsOrganization } from "@/lib/auth/event-access";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/organizations/[id]/posts/[postId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; postId: string } }
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
    const result = orgPostSchema.partial().safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const post = await prisma.organizationPost.update({
      where: { id: params.postId, organizationId: params.id },
      data: result.data,
      include: {
        author: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error("PATCH org post error:", error);
    return NextResponse.json({ error: "Error al actualizar publicación" }, { status: 500 });
  }
}

/**
 * DELETE /api/organizations/[id]/posts/[postId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; postId: string } }
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

    await prisma.organizationPost.delete({
      where: { id: params.postId, organizationId: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE org post error:", error);
    return NextResponse.json({ error: "Error al eliminar publicación" }, { status: 500 });
  }
}
