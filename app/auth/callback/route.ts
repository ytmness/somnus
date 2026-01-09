import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/auth/supabase-auth";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /auth/callback
 * Callback para verificación de email de Supabase Auth
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (code) {
    const supabase = createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Actualizar emailVerified en nuestra tabla User
      try {
        await prisma.user.update({
          where: { email: data.user.email! },
          data: {
            emailVerified: true,
          } as any,
        });
      } catch (dbError) {
        console.error("[AUTH CALLBACK] Error al actualizar emailVerified:", dbError);
        // Continuar aunque falle la actualización
      }

      // Redirigir después de verificación exitosa
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Si hay error, redirigir a login
  return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
}

