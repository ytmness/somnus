import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { saveUploadBuffer } from "@/lib/storage/local";
import {
  guessUploadImageExt,
  validateUploadImage,
} from "@/lib/storage/upload-image-validation";

export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/upload/profile-image
 * formData: file, kind = "avatar" | "background"
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kindRaw = String(formData.get("kind") || "avatar");
    const kind = kindRaw === "background" ? "background" : "avatar";

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

    const validationError = validateUploadImage(fileObj, MAX_SIZE);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const ext = guessUploadImageExt(fileObj);
    const buffer = Buffer.from(await fileObj.arrayBuffer());
    const saved = await saveUploadBuffer({
      buffer,
      subdirectory: `profiles/${user.id}`,
      originalName: `${kind}.${ext}`,
      contentType: fileObj.type,
    });

    return NextResponse.json({
      success: true,
      data: { url: saved.publicUrl, kind },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Upload profile-image]", err);
    return NextResponse.json(
      { error: msg || "Error al subir la imagen" },
      { status: 500 }
    );
  }
}
