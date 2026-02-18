import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/gallery/sections/[id]
 * Actualizar sección (solo ADMIN)
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
    const section = await prisma.gallerySection.update({
      where: { id: params.id },
      data: {
        ...(body.title != null && { title: body.title }),
        ...(body.sortOrder != null && { sortOrder: body.sortOrder }),
      },
    });
    return NextResponse.json({ success: true, data: section });
  } catch (error) {
    console.error("Gallery section update error:", error);
    return NextResponse.json(
      { error: "Error al actualizar sección" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gallery/sections/[id]
 * Eliminar sección y sus imágenes (solo ADMIN)
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

    await prisma.gallerySection.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gallery section delete error:", error);
    return NextResponse.json(
      { error: "Error al eliminar sección" },
      { status: 500 }
    );
  }
}
