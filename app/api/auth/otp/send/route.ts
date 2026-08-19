import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmailOtp } from "@/lib/auth/otp";

export const dynamic = "force-dynamic";

const sendOtpSchema = z.object({
  email: z.string().email("Email inválido"),
});

/**
 * POST /api/auth/otp/send
 * Genera OTP de 8 dígitos, lo guarda hasheado y lo envía por SMTP (Postfix → GoDaddy).
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

    const emailTrim = result.data.email.trim().toLowerCase();
    const sent = await sendEmailOtp(emailTrim);

    if (!sent.ok) {
      return NextResponse.json({ error: sent.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Código OTP enviado a tu email",
      cooldown: sent.cooldown || undefined,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[OTP SEND] Error:", msg);
    return NextResponse.json(
      { error: "Error al enviar código OTP", details: msg },
      { status: 500 }
    );
  }
}
