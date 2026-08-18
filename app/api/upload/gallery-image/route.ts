import { NextRequest, NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/session";
import { saveUploadBuffer } from "@/lib/storage/local";

export const dynamic = "force-dynamic";

const MAX_SIZE = 15 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/x-ms-bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-tiff": "tiff",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

function guessExt(file: { name: string; type: string }): string {
  if (file.type && MIME_TO_EXT[file.type]) return MIME_TO_EXT[file.type];
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]{2,5}$/i.test(ext)) return ext;
  return "jpg";
}

function isProbablyImage(file: { name: string; type: string }): boolean {
  if (file.type && file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|avif|svg|bmp|tiff?|ico|heic|heif)$/i.test(
    file.name
  );
}

/**
 * POST /api/upload/gallery-image
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

    if (!isProbablyImage(fileObj)) {
      return NextResponse.json(
        { error: "El archivo no parece una imagen" },
        { status: 400 }
      );
    }

    const ext = guessExt(fileObj);
    const buffer = Buffer.from(await fileObj.arrayBuffer());
    const saved = await saveUploadBuffer({
      buffer,
      subdirectory: "gallery",
      originalName: `image.${ext}`,
      contentType: fileObj.type,
    });

    return NextResponse.json({
      success: true,
      data: { url: saved.publicUrl },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Upload gallery-image]", err);
    return NextResponse.json(
      { error: msg || "Error al subir la imagen" },
      { status: 500 }
    );
  }
}
