/**
 * OTP de 8 dígitos (propio, sin Supabase Auth OTP)
 * Usa la tabla User.verificationCode y el servicio de email
 */

import { prisma } from "@/lib/db/prisma";
import { generateVerificationCode, sendVerificationCode } from "@/lib/services/email";

const OTP_EXPIRES_MINUTES = 10;

export async function sendOtpToEmail(email: string, name?: string): Promise<{ success: boolean; error?: string }> {
  const code = generateVerificationCode();
  const expires = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

  try {
    // Buscar o crear usuario para guardar el código
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          password: "",
          role: "CLIENTE",
          isActive: true,
          emailVerified: false,
          verificationCode: code,
          verificationCodeExpires: expires,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationCode: code,
          verificationCodeExpires: expires,
        },
      });
    }

    const sent = await sendVerificationCode(email, user.name, code);
    if (!sent) {
      return { success: false, error: "Error al enviar el email" };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[OTP] Error:", err);
    return { success: false, error: err?.message || "Error al enviar código" };
  }
}

export async function verifyOtpCode(
  email: string,
  token: string
): Promise<{ valid: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { valid: false, error: "Usuario no encontrado" };
  }

  if (!user.verificationCode || !user.verificationCodeExpires) {
    return { valid: false, error: "Código no solicitado o ya usado" };
  }

  if (user.verificationCode !== token) {
    return { valid: false, error: "Código incorrecto" };
  }

  if (new Date() > user.verificationCodeExpires) {
    return { valid: false, error: "Código expirado. Solicita uno nuevo." };
  }

  return { valid: true };
}
