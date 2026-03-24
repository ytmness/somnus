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
      orderBy: { createdAt: "desc" },
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
        createdAt: s.createdAt.toISOString(),
        images: s.images.map((i) => i.url),
      })),
    });
  } catch (error) {
    console.error("Get gallery error:", error);
    return NextResponse.json(
      { error: "Failed to load gallery" },
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
          title: title || "New section",
          sortOrder: body.sortOrder ?? 0,
        },
      });
      return NextResponse.json({ success: true, data: section });
    }

    if (action === "image" && sectionId) {
      let sortOrder: number =
        typeof body.sortOrder === "number" ? body.sortOrder : NaN;
      if (Number.isNaN(sortOrder)) {
        const agg = await prisma.galleryImage.aggregate({
          where: { sectionId },
          _max: { sortOrder: true },
        });
        sortOrder = (agg._max.sortOrder ?? -1) + 1;
      }
      const image = await prisma.galleryImage.create({
        data: {
          sectionId,
          url: url || "",
          alt: alt || null,
          sortOrder,
        },
      });
      return NextResponse.json({ success: true, data: image });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Gallery POST error:", error);
    return NextResponse.json(
      { error: "Failed to update gallery" },
      { status: 500 }
    );
  }
}
