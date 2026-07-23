import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isInOtpCooldown, markOtpSent } from "@/lib/auth/otp-cooldown";
import {
  generateVerificationCode,
  hashToken,
  sendVerificationCode,
} from "@/lib/services/email";

export const dynamic = "force-dynamic";

const sendOtpSchema = z.object({
  email: z.string().email("Email inválido"),
});

/**
 * POST /api/auth/otp/send
 * Genera OTP de 8 dígitos, lo guarda hasheado y lo envía por Resend.
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

    if (isInOtpCooldown(emailTrim)) {
      return NextResponse.json({
        success: true,
        message: "Código OTP enviado a tu email",
        cooldown: true,
      });
    }

    const user = await prisma.user.findUnique({ where: { email: emailTrim } });
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        email: emailTrim,
        codeHash: hashToken(code),
        expiresAt,
        userId: user?.id ?? null,
      },
    });

    const sent = await sendVerificationCode(
      emailTrim,
      user?.name || emailTrim.split("@")[0],
      code
    );

    if (!sent) {
      return NextResponse.json(
        { error: "No se pudo enviar el código. Intenta de nuevo." },
        { status: 500 }
      );
    }

    markOtpSent(emailTrim);

    return NextResponse.json({
      success: true,
      message: "Código OTP enviado a tu email",
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
