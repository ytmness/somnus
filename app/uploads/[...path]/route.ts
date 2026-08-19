import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { resolveSafeUploadPath } from "@/lib/storage/local";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

/**
 * GET /uploads/...
 * Sirve archivos del disco local (UPLOAD_DIR).
 */
export async function GET(
  _request: NextRequest,
  context: { params: { path: string[] } }
) {
  try {
    const parts = context.params.path || [];
    const absolute = resolveSafeUploadPath(parts);
    if (!absolute) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await fs.readFile(absolute);
    const ext = path.extname(absolute).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
