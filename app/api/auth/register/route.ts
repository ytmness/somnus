import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/validations/schemas";
import { sendOtpToEmail } from "@/lib/auth/otp";

/**
 * POST /api/auth/register
 * Registrar un nuevo usuario y enviar código OTP de 8 dígitos
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

    const { email, name, role } = result.data;
    const userRole = (role || "CLIENTE") as any;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400 }
      );
    }

    // Crear usuario en nuestra tabla User
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: userRole,
        isActive: true,
        password: "",
        emailVerified: false,
      } as any,
    }) as any;

    // Enviar código OTP de 8 dígitos (usa User.verificationCode)
    const { success, error: otpError } = await sendOtpToEmail(email, name);

    if (!success) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      return NextResponse.json(
        { error: otpError || "Error al enviar código de verificación" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Usuario registrado. Verifica tu email con el código de 8 dígitos enviado.",
      requiresVerification: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error: any) {
    console.error("[REGISTER] Error general:", error);
    return NextResponse.json(
      { error: "Error al registrar usuario", details: error.message },
      { status: 500 }
    );
  }
}

