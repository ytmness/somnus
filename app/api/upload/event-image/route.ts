import { NextRequest, NextResponse } from "next/server";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { supabaseAdmin } from "@/lib/db/supabase";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const BUCKET = "event-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

/**
 * POST /api/upload/event-image
 * Subir imagen de evento a Supabase Storage (solo ADMIN)
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor. Añádela en .env (Supabase → Settings → API → service_role).",
        },
        { status: 500 }
      );
    }

    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    // File no existe como global en Node.js; validar por propiedades
    const isFileLike =
      file &&
      typeof file === "object" &&
      "size" in file &&
      "type" in file &&
      typeof (file as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === "function";

    if (!isFileLike) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo" },
        { status: 400 }
      );
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
    const path = `posters/${uniqueName}`;

    const arrayBuffer = await fileObj.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: fileObj.type,
        upsert: false,
      });

    if (error) {
      console.error("[Upload event-image]", error);
      if (error.message?.includes("Bucket not found") || error.message?.includes("does not exist")) {
        return NextResponse.json(
          {
            error:
              "El bucket de almacenamiento no existe. Crea un bucket 'event-images' público en Supabase → Storage.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: error.message || "Error al subir la imagen" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path);
    const publicUrl = urlData.publicUrl;

    return NextResponse.json({
      success: true,
      data: { url: publicUrl },
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

/**
 * GET /api/upload/event-image
 * Diagnóstico: verifica si la configuración está lista (solo ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const checks: Record<string, boolean | string> = {
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    };

    const allOk = checks.SUPABASE_SERVICE_ROLE_KEY && checks.NEXT_PUBLIC_SUPABASE_URL;
    if (!allOk) {
      return NextResponse.json({
        ok: false,
        checks,
        error: !checks.SUPABASE_SERVICE_ROLE_KEY
          ? "Añade SUPABASE_SERVICE_ROLE_KEY en .env del servidor"
          : "Falta configuración de Supabase",
      });
    }

    // Probar que el bucket existe
    const { data: list, error } = await supabaseAdmin.storage.from(BUCKET).list("posters", { limit: 1 });
    if (error) {
      return NextResponse.json({
        ok: false,
        checks: { ...checks, bucket: false },
        error: error.message,
        hint: "¿Creaste el bucket 'event-images' en Supabase → Storage? Debe ser público.",
      });
    }

    return NextResponse.json({ ok: true, checks: { ...checks, bucket: true } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
