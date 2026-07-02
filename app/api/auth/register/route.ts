import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/auth/supabase-auth";
import { isInOtpCooldown, markOtpSent } from "@/lib/auth/otp-cooldown";
import { resolvePublicRegistrationRole } from "@/lib/auth/registration";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/validations/schemas";

/**
 * POST /api/auth/register
 * Registrar usuario en tabla User + enviar OTP (8 dígitos) via Supabase Auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email, name, phone } = result.data;
    const emailTrim = email.trim().toLowerCase();
    const userRole = resolvePublicRegistrationRole();
    const phoneClean = phone?.trim() || null;

    if (isInOtpCooldown(emailTrim)) {
      return NextResponse.json({
        success: true,
        message: "Código enviado. Revisa tu correo.",
        cooldown: true,
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: emailTrim },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "Este correo ya está registrado. Inicia sesión.",
          code: "EMAIL_EXISTS",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email: emailTrim,
        name: name.trim(),
        phone: phoneClean,
        role: userRole,
        isActive: true,
        password: "",
        emailVerified: false,
      } as any,
    }) as any;

    const supabase = createServerClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: emailTrim,
      options: { shouldCreateUser: true },
    });

    if (otpError) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      const isRateLimit =
        otpError.message?.toLowerCase().includes("rate") ||
        otpError.code === "rate_limit_exceeded";
      return NextResponse.json(
        {
          error: isRateLimit
            ? "Demasiados intentos. Espera 1 minuto."
            : otpError.message || "Error al enviar código de verificación",
        },
        { status: isRateLimit ? 429 : 400 }
      );
    }

    markOtpSent(emailTrim);

    return NextResponse.json({
      success: true,
      message: "Cuenta creada. Revisa tu correo con el código de 8 dígitos.",
      requiresVerification: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[REGISTER] Error general:", msg);
    return NextResponse.json(
      { error: "Error al registrar usuario", details: msg },
      { status: 500 }
    );
  }
}
