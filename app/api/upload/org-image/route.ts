import { NextRequest, NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/session";
import { userOwnsOrganization } from "@/lib/auth/event-access";
import { saveUploadBuffer } from "@/lib/storage/local";
import {
  guessUploadImageExt,
  validateUploadImage,
} from "@/lib/storage/upload-image-validation";

export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/upload/org-image
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN", "ORGANIZER"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const organizationId = formData.get("organizationId") as string | null;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId requerido" },
        { status: 400 }
      );
    }

    const owns = await userOwnsOrganization(user!, organizationId);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

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
      subdirectory: `orgs/${organizationId}`,
      originalName: `image.${ext}`,
      contentType: fileObj.type,
    });

    return NextResponse.json({
      success: true,
      data: { url: saved.publicUrl },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Upload org-image]", err);
    return NextResponse.json(
      { error: msg || "Error al subir la imagen" },
      { status: 500 }
    );
  }
}
