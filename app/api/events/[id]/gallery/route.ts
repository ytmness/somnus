import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/session";
import { userOwnsEvent } from "@/lib/auth/event-access";
import { saveUploadBuffer } from "@/lib/storage/local";
import {
  guessUploadImageExt,
  validateUploadImage,
} from "@/lib/storage/upload-image-validation";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024;

/**
 * GET /api/events/[id]/gallery — público
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.event.findFirst({
      where: { id: params.id, isActive: true },
      select: { id: true, name: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const images = await prisma.eventGalleryImage.findMany({
      where: { eventId: event.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        url: true,
        alt: true,
        sortOrder: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { event, images },
    });
  } catch (error) {
    console.error("GET event gallery error:", error);
    return NextResponse.json(
      { error: "Error al obtener galería" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/gallery
 * Organizer/admin: multipart (file | url) o JSON { url, alt?, sortOrder? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!user || !hasRole(user, ["ADMIN", "ORGANIZER"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const owns = await userOwnsEvent(user, params.id);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";
    let url: string | null = null;
    let alt: string | null = null;
    let sortOrder: number | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      alt = (formData.get("alt") as string) || null;
      const sortRaw = formData.get("sortOrder");
      if (typeof sortRaw === "string" && sortRaw.trim()) {
        const n = Number(sortRaw);
        if (!Number.isNaN(n)) sortOrder = n;
      }

      const existingUrl = formData.get("url");
      if (typeof existingUrl === "string" && existingUrl.trim()) {
        url = existingUrl.trim();
      } else {
        const file = formData.get("file");
        const isFileLike =
          file &&
          typeof file === "object" &&
          "size" in file &&
          "type" in file &&
          typeof (file as { arrayBuffer?: () => Promise<ArrayBuffer> })
            .arrayBuffer === "function";

        if (!isFileLike) {
          return NextResponse.json(
            { error: "Se requiere archivo o url" },
            { status: 400 }
          );
        }

        const fileObj = file as {
          name: string;
          size: number;
          type: string;
          arrayBuffer: () => Promise<ArrayBuffer>;
        };

        const validationError = validateUploadImage(fileObj, MAX_SIZE);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }

        const ext = guessUploadImageExt(fileObj);
        const buffer = Buffer.from(await fileObj.arrayBuffer());
        const saved = await saveUploadBuffer({
          buffer,
          subdirectory: "event-gallery",
          originalName: `gallery.${ext}`,
          contentType: fileObj.type,
        });
        url = saved.publicUrl;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      url = typeof body.url === "string" ? body.url.trim() : null;
      alt = typeof body.alt === "string" ? body.alt : null;
      if (typeof body.sortOrder === "number") sortOrder = body.sortOrder;
    }

    if (!url) {
      return NextResponse.json({ error: "Se requiere url" }, { status: 400 });
    }

    let finalSort = sortOrder;
    if (finalSort === null) {
      const max = await prisma.eventGalleryImage.aggregate({
        where: { eventId: event.id },
        _max: { sortOrder: true },
      });
      finalSort = (max._max.sortOrder ?? -1) + 1;
    }

    const image = await prisma.eventGalleryImage.create({
      data: {
        eventId: event.id,
        url,
        alt,
        sortOrder: finalSort,
      },
    });

    return NextResponse.json({ success: true, data: image }, { status: 201 });
  } catch (error) {
    console.error("POST event gallery error:", error);
    return NextResponse.json(
      { error: "Error al añadir imagen" },
      { status: 500 }
    );
  }
}
