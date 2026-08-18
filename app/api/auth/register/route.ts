import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { resolvePublicRegistrationRole } from "@/lib/auth/registration";
import { sendEmailOtp } from "@/lib/auth/otp";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/register
 * Crea usuario sin sesión hasta verificar email con OTP.
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

    const { email, name, phone, password } = result.data;
    const emailTrim = email.trim().toLowerCase();
    const userRole = resolvePublicRegistrationRole();
    const phoneClean = phone?.trim() || null;
    const hashedPassword = await bcrypt.hash(password, 10);

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
        password: hashedPassword,
        emailVerified: false,
      },
    });

    const otp = await sendEmailOtp(emailTrim, user.name);
    if (!otp.ok) {
      return NextResponse.json(
        {
          error:
            "Cuenta creada, pero no pudimos enviar el código. Ve a verificar email y reenvía el código.",
          code: "OTP_SEND_FAILED",
          requiresVerification: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cuenta creada. Revisa tu correo e ingresa el código de verificación.",
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
