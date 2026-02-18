import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/schemas";
import { sendOtpToEmail } from "@/lib/auth/otp";

/**
 * POST /api/auth/login
 * Enviar código OTP de 8 dígitos para iniciar sesión
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
    const { success, error } = await sendOtpToEmail(email);

    if (!success) {
      return NextResponse.json(
        { error: error || "Error al enviar código de verificación" },
        { status: 400 }
      );
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
