import { NextRequest, NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/session";
import { saveUploadBuffer } from "@/lib/storage/local";

export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * POST /api/upload/event-image
 * Sube poster a disco local (solo ADMIN)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    const isFileLike =
      file &&
      typeof file === "object" &&
      "size" in file &&
      "type" in file &&
      typeof (file as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer ===
        "function";

    if (!isFileLike) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    const fileObj = file as {
      name: string;
      size: number;
      type: string;
      arrayBuffer: () => Promise<ArrayBuffer>;
    };

    if (fileObj.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `La imagen no debe superar ${MAX_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(fileObj.type)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usa JPG, PNG, GIF o WebP." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await fileObj.arrayBuffer());
    const saved = await saveUploadBuffer({
      buffer,
      subdirectory: "posters",
      originalName: fileObj.name,
      contentType: fileObj.type,
    });

    return NextResponse.json({
      success: true,
      data: { url: saved.publicUrl },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Upload event-image]", err);
    return NextResponse.json(
      { error: msg || "Error al subir la imagen" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json({
      ok: true,
      storage: "local",
      uploadDir: process.env.UPLOAD_DIR || "(default ./uploads)",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
