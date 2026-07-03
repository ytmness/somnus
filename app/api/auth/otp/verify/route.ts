import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { prisma } from "@/lib/db/prisma";
import { resolvePublicRegistrationRole } from "@/lib/auth/registration";
import { otpVerifySchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * POST /api/auth/otp/verify
 * Verificar código OTP (8 dígitos) via Supabase Auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = otpVerifySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email, token } = result.data;
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

    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (authError || !authData?.user) {
      console.error("[OTP VERIFY] Error:", authError);
      const msg =
        authError?.code === "otp_expired"
          ? "El código expiró. Solicita uno nuevo."
          : authError?.message || "Código inválido o expirado";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { email },
    }) as any;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: email.split("@")[0],
          role: resolvePublicRegistrationRole(),
          isActive: true,
          password: "",
          emailVerified: true,
        } as any,
      });
    } else if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true } as any,
      });
      user.emailVerified = true;
    }

    const jsonResponse = NextResponse.json({
      success: true,
      message: "OTP verificado correctamente",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });

    pendingCookies.forEach(({ name, value, options }) => {
      jsonResponse.cookies.set(name, value, options as Parameters<typeof jsonResponse.cookies.set>[2]);
    });

    return jsonResponse;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[OTP VERIFY] Error general:", msg);
    return NextResponse.json(
      { error: "Error al verificar el código", details: msg },
      { status: 500 }
    );
  }
}
