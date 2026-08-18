import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/services/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

/**
 * POST /api/auth/reset-password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos. La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(parsed.data.token);
    const record = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Enlace inválido o expirado" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(parsed.data.password, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.email },
        data: { password: hashed, emailVerified: true },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada. Ya puedes iniciar sesión.",
    });
  } catch (error: unknown) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { error: "Error al restablecer la contraseña" },
      { status: 500 }
    );
  }
}
