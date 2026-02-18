import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/gallery/images/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const image = await prisma.galleryImage.update({
      where: { id: params.id },
      data: {
        ...(body.url != null && { url: body.url }),
        ...(body.alt != null && { alt: body.alt }),
        ...(body.sortOrder != null && { sortOrder: body.sortOrder }),
      },
    });
    return NextResponse.json({ success: true, data: image });
  } catch (error) {
    console.error("Gallery image update error:", error);
    return NextResponse.json(
      { error: "Error al actualizar imagen" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gallery/images/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.galleryImage.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gallery image delete error:", error);
    return NextResponse.json(
      { error: "Error al eliminar imagen" },
      { status: 500 }
    );
  }
}
