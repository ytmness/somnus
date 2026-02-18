import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/gallery/full
 * Todas las secciones con sus imágenes (para admin)
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

    return NextResponse.json({ success: true, data: sections });
  } catch (error) {
    console.error("Get gallery full error:", error);
    return NextResponse.json(
      { error: "Error al obtener galería" },
      { status: 500 }
    );
  }
}
