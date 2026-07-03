import { NextRequest, NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { supabaseAdmin } from "@/lib/db/supabase";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const BUCKET = "event-images";
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

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
 * Subir imagen de galería (cualquier tipo image/* + HEIC por extensión)
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing SUPABASE_SERVICE_ROLE_KEY. Add it in server .env (Supabase → Settings → API).",
        },
        { status: 500 }
      );
    }

    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    const isFileLike =
      file &&
      typeof file === "object" &&
      "size" in file &&
      typeof (file as { arrayBuffer?: () => Promise<ArrayBuffer> })
        .arrayBuffer === "function";

    if (!isFileLike) {
      return NextResponse.json(
        { success: false, error: "No file received" },
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
        {
          success: false,
          error: `Image must be under ${MAX_SIZE / 1024 / 1024} MB`,
        },
        { status: 400 }
      );
    }

    if (!isProbablyImage(fileObj)) {
      return NextResponse.json(
        { success: false, error: "File must be an image" },
        { status: 400 }
      );
    }

    const ext = guessExt(fileObj);
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    const path = `gallery/${uniqueName}`;

    const extLower = ext.toLowerCase();
    const fallbackMime = (): string => {
      if (extLower === "jpg" || extLower === "jpeg") return "image/jpeg";
      if (extLower === "svg") return "image/svg+xml";
      if (extLower === "heic" || extLower === "heif") return "image/heic";
      return `image/${extLower}`;
    };
    const contentType =
      fileObj.type && fileObj.type.startsWith("image/")
        ? fileObj.type
        : fallbackMime();

    const arrayBuffer = await fileObj.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("[Upload gallery-image]", error);
      const msg = error.message || "Upload failed";
      if (
        msg.includes("Bucket not found") ||
        msg.includes("does not exist")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Storage bucket missing. Create a public bucket named 'event-images' in Supabase → Storage (same as event posters).",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { success: false, error: msg },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      data: { url: urlData.publicUrl },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Upload gallery-image]", err);
    return NextResponse.json(
      { success: false, error: msg || "Upload failed" },
      { status: 500 }
    );
  }
}
