import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/auth/supabase-auth";
import { isInOtpCooldown, markOtpSent } from "@/lib/auth/otp-cooldown";
import { z } from "zod";

const sendOtpSchema = z.object({
  email: z.string().email("Email inválido"),
});

/**
 * POST /api/auth/otp/send
 * Reenviar código OTP (8 dígitos) via Supabase Auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = sendOtpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Email inválido", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const emailTrim = email.trim();

    if (isInOtpCooldown(emailTrim)) {
      return NextResponse.json({
        success: true,
        message: "Código OTP enviado a tu email",
        cooldown: true,
      });
    }

    const supabase = createServerClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: emailTrim,
      options: { shouldCreateUser: true },
    });

    if (error) {
      const isRateLimit =
        error.message?.toLowerCase().includes("rate") ||
        error.code === "rate_limit_exceeded" ||
        error.status === 429;
      return NextResponse.json(
        {
          error: isRateLimit
            ? "Demasiados intentos. Espera 1 minuto y vuelve a intentar."
            : error.message || "Error al enviar código OTP",
        },
        { status: isRateLimit ? 429 : 400 }
      );
    }

    markOtpSent(emailTrim);

    return NextResponse.json({
      success: true,
      message: "Código OTP enviado a tu email",
    });
  } catch (error: any) {
    console.error("[OTP SEND] Error:", error);
    return NextResponse.json(
      { error: "Error al enviar código OTP", details: error.message },
      { status: 500 }
    );
  }
}
