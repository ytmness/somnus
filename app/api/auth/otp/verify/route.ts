import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/services/email";

export const dynamic = "force-dynamic";

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(8),
});

/**
 * POST /api/auth/otp/verify
 * Verifica OTP y abre sesión Auth.js (credentials + otpCode).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = verifyOtpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const email = result.data.email.trim().toLowerCase();
    const code = result.data.code.trim();
    const codeHash = hashToken(code);

    const record = await prisma.otpCode.findFirst({
      where: {
        email,
        codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Código inválido o expirado" },
        { status: 400 }
      );
    }

    try {
      await signIn("credentials", {
        email,
        otpCode: code,
        redirect: false,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: "No se pudo iniciar sesión con el código" },
          { status: 401 }
        );
      }
    }

    const user = await prisma.user.findUnique({ where: { email } });

    return NextResponse.json({
      success: true,
      message: "Email verificado",
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified,
          }
        : null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[OTP VERIFY] Error:", msg);
    return NextResponse.json(
      { error: "Error al verificar código", details: msg },
      { status: 500 }
    );
  }
}
