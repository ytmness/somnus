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
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `La imagen no debe superar ${MAX_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usa JPG, PNG, GIF o WebP." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? ext : "jpg";
    const uniqueName = `${crypto.randomUUID()}.${safeExt}`;
    const path = `posters/${uniqueName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
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
    console.error("[Upload event-image]", err);
    return NextResponse.json(
      { error: "Error al subir la imagen" },
      { status: 500 }
    );
  }
}
