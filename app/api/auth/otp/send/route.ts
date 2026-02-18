import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendOtpToEmail } from "@/lib/auth/otp";

const sendOtpSchema = z.object({
  email: z.string().email("Email inválido"),
});

/**
 * POST /api/auth/otp/send
 * Enviar código OTP de 8 dígitos
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
    const { success, error } = await sendOtpToEmail(email);

    if (!success) {
      return NextResponse.json(
        { error: error || "Error al enviar código OTP" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Código OTP enviado a tu email",
    });
  } catch (error: any) {
    console.error("[OTP SEND] Error general:", error);
    return NextResponse.json(
      { error: "Error al enviar código OTP", details: error.message },
      { status: 500 }
    );
  }
}
