import { NextRequest, NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { supabaseAdmin } from "@/lib/db/supabase";
import { userOwnsOrganization } from "@/lib/auth/event-access";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const BUCKET = "event-images";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

/**
 * POST /api/upload/org-image
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." },
        { status: 500 }
      );
    }

    const user = await getSession();
    if (!hasRole(user, ["ADMIN", "ORGANIZER"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const organizationId = formData.get("organizationId") as string | null;

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId requerido" }, { status: 400 });
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
      typeof (file as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === "function";

    if (!isFileLike) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }

    const fileObj = file as { name: string; size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> };

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

    const ext = fileObj.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? ext : "jpg";
    const uniqueName = `${crypto.randomUUID()}.${safeExt}`;
    const path = `orgs/${organizationId}/${uniqueName}`;

    const buffer = Buffer.from(await fileObj.arrayBuffer());

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: fileObj.type, upsert: false });

    if (error) {
      console.error("[Upload org-image]", error);
      return NextResponse.json(
        { error: error.message || "Error al subir la imagen" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path);

    return NextResponse.json({ success: true, data: { url: urlData.publicUrl } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Upload org-image]", err);
    return NextResponse.json({ error: msg || "Error al subir la imagen" }, { status: 500 });
  }
}
