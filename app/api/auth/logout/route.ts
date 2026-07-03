import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * POST /api/auth/logout
 * Cerrar sesión usando Supabase Auth
 */
export async function POST(request: NextRequest) {
  try {
    const pendingCookies: CookieToSet[] = [];

    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            pendingCookies.push(...cookiesToSet);
          },
        },
      }
    );

    await supabase.auth.signOut();

    const response = NextResponse.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });

    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Error al cerrar sesión" },
      { status: 500 }
    );
  }
}
