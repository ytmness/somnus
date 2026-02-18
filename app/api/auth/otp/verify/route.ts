import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/db/supabase";
import { otpVerifySchema } from "@/lib/validations/schemas";
import { verifyOtpCode } from "@/lib/auth/otp";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/otp/verify
 * Verificar código OTP de 8 dígitos (propio) y establecer sesión Supabase
 */
export async function POST(request: NextRequest) {
  const response = new NextResponse();

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

    // 1. Verificar nuestro código OTP (User.verificationCode)
    const { valid, error: verifyError } = await verifyOtpCode(email, token);
    if (!valid) {
      return NextResponse.json(
        { error: verifyError || "Código OTP inválido o expirado" },
        { status: 400 }
      );
    }

    // 2. Obtener usuario y limpiar código usado
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: null,
        verificationCodeExpires: null,
        emailVerified: true,
      },
    });

    // 3. Asegurar que existe en Supabase Auth (createUser no envía email si ya existe)
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: user.name },
    });
    // Ignorar error si el usuario ya existe
    if (createErr && !createErr.message?.toLowerCase().includes("already")) {
      console.error("[OTP VERIFY] Error creando usuario Supabase:", createErr);
      return NextResponse.json(
        { error: "Error al crear sesión" },
        { status: 500 }
      );
    }

    // 4. Generar magic link (solo para obtener token, no envía email)
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("[OTP VERIFY] Error generateLink:", linkErr);
      return NextResponse.json(
        { error: "Error al crear sesión" },
        { status: 500 }
      );
    }

    const tokenHash = linkData.properties.hashed_token;

    // 5. Establecer sesión via verifyOtp en el cliente SSR (cookies)
    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });

    if (verifyErr) {
      console.error("[OTP VERIFY] Error verifyOtp:", verifyErr);
      return NextResponse.json(
        { error: "Error al crear sesión" },
        { status: 500 }
      );
    }

    const { data: { session } } = await supabase.auth.getSession();

    const jsonResponse = NextResponse.json({
      success: true,
      message: "Código OTP verificado exitosamente",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: true,
      },
      session: session
        ? { access_token: session.access_token, refresh_token: session.refresh_token }
        : null,
    });

    response.cookies.getAll().forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as any,
        path: cookie.path,
        maxAge: cookie.maxAge,
      });
    });

    return jsonResponse;
  } catch (error: any) {
    console.error("[OTP VERIFY] Error general:", error);
    return NextResponse.json(
      { error: "Error al verificar código OTP", details: error.message },
      { status: 500 }
    );
  }
}
