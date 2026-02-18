import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/gallery
 * Obtener secciones y fotos de la galería (público)
 */
export async function GET() {
  try {
    const sections = await prisma.gallerySection.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: sections.map((s) => ({
        id: s.id,
        title: s.title,
        images: s.images.map((i) => i.url),
      })),
    });
  } catch (error) {
    console.error("Get gallery error:", error);
    return NextResponse.json(
      { error: "Error al obtener galería" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gallery
 * Crear sección o imagen (solo ADMIN)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { action, sectionId, title, url, alt } = body;

    if (action === "section") {
      const section = await prisma.gallerySection.create({
        data: {
          title: title || "Nueva sección",
          sortOrder: body.sortOrder ?? 0,
        },
      });
      return NextResponse.json({ success: true, data: section });
    }

    if (action === "image" && sectionId) {
      const image = await prisma.galleryImage.create({
        data: {
          sectionId,
          url: url || "",
          alt: alt || null,
          sortOrder: body.sortOrder ?? 0,
        },
      });
      return NextResponse.json({ success: true, data: image });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    console.error("Gallery POST error:", error);
    return NextResponse.json(
      { error: "Error al actualizar galería" },
      { status: 500 }
    );
  }
}
