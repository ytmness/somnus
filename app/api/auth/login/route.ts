import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/auth/supabase-auth";
import { isInOtpCooldown, markOtpSent } from "@/lib/auth/otp-cooldown";
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
        { error: "Invalid email", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const emailTrim = email.trim();

    if (isInOtpCooldown(emailTrim)) {
      return NextResponse.json({
        success: true,
        message: "Verification code sent to your email",
        cooldown: true,
      });
    }

    const supabase = createServerClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: emailTrim,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("[LOGIN] Error:", error.message, error.code);
      const isRateLimit =
        error.message?.toLowerCase().includes("rate") ||
        error.code === "rate_limit_exceeded" ||
        error.status === 429;
      const msg = isRateLimit
        ? "Demasiados intentos. Espera 1 minuto y vuelve a intentar."
        : error.message || "Error sending verification code";
      return NextResponse.json({ error: msg }, { status: isRateLimit ? 429 : 400 });
    }

    markOtpSent(emailTrim);

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (error: any) {
    console.error("[LOGIN] Error general:", error);
    return NextResponse.json(
      { error: "Error sending verification code" },
      { status: 500 }
    );
  }
}
