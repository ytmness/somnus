import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/auth/supabase-auth";
import { loginSchema } from "@/lib/validations/schemas";

/**
 * POST /api/auth/login
 * Enviar código OTP (8 dígitos) via Supabase Auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Email inválido", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const supabase = createServerClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("[LOGIN] Error:", error.message, error.code);
      // Supabase rate limit: espera 60 segundos entre OTPs al mismo email
      const isRateLimit =
        error.message?.toLowerCase().includes("rate") ||
        error.code === "rate_limit_exceeded" ||
        error.status === 429;
      const msg = isRateLimit
        ? "Demasiados intentos. Espera 1 minuto y vuelve a intentar."
        : error.message || "Error al enviar código de verificación";
      return NextResponse.json({ error: msg }, { status: isRateLimit ? 429 : 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Código de verificación enviado a tu email",
    });
  } catch (error: any) {
    console.error("[LOGIN] Error general:", error);
    return NextResponse.json(
      { error: "Error al enviar código de verificación" },
      { status: 500 }
    );
  }
}
