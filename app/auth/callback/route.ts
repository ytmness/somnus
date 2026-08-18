import { NextRequest, NextResponse } from "next/server";
import { sanitizeRedirectPath } from "@/lib/auth/redirect-path";

export const dynamic = "force-dynamic";

/**
 * Compat: antiguos links de Supabase /auth/callback → home o next.
 * OAuth ahora termina en /api/auth/callback/[provider] (Auth.js).
 */
export async function GET(request: NextRequest) {
  const next = sanitizeRedirectPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(next || "/", request.url));
}
