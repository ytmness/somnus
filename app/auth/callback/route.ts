import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { resolveAuthRedirectForUser } from "@/lib/auth/redirect-path";
import { ensurePrismaUserFromAuth } from "@/lib/auth/sync-user";
import { sanitizeRedirectPath } from "@/lib/auth/redirect-path";

export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * GET /auth/callback
 * Callback para OAuth (Google, Apple) y magic links de Supabase Auth
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const safeNext = sanitizeRedirectPath(nextParam);

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url)
    );
  }

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    console.error("[AUTH CALLBACK] Error:", error?.message);
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url)
    );
  }

  try {
    const prismaUser = await ensurePrismaUserFromAuth(data.user);

    if (!prismaUser.isActive) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/login?error=account_inactive", request.url)
      );
    }

    const redirectPath = await resolveAuthRedirectForUser(
      prismaUser.id,
      prismaUser.role,
      safeNext
    );
    const response = NextResponse.redirect(new URL(redirectPath, request.url));

    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(
        name,
        value,
        options as Parameters<typeof response.cookies.set>[2]
      );
    });

    return response;
  } catch (dbError) {
    console.error("[AUTH CALLBACK] Error al sincronizar usuario:", dbError);
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url)
    );
  }
}
