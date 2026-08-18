import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashToken, sendPasswordResetEmail } from "@/lib/services/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/forgot-password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // Respuesta genérica para no filtrar existencia de cuentas
    const ok = NextResponse.json({
      success: true,
      message: "Si el correo existe, enviamos un enlace para restablecer la contraseña.",
    });

    if (!user || !user.isActive) return ok;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        email,
        tokenHash: hashToken(rawToken),
        expiresAt,
        userId: user.id,
      },
    });

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin ||
      "http://localhost:3000";
    const resetUrl = `${base.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail(email, user.name, resetUrl);
    return ok;
  } catch (error: unknown) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { error: "Error al solicitar restablecimiento" },
      { status: 500 }
    );
  }
}
