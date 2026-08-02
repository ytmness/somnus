import { prisma } from "@/lib/db/prisma";
import { isInOtpCooldown, markOtpSent } from "@/lib/auth/otp-cooldown";
import {
  generateVerificationCode,
  hashToken,
  sendVerificationCode,
} from "@/lib/services/email";

export type SendEmailOtpResult =
  | { ok: true; cooldown: boolean }
  | { ok: false; error: string };

/**
 * Genera OTP de 8 dígitos, lo guarda hasheado y lo envía por email.
 * Respeta cooldown de 1 minuto por correo.
 */
export async function sendEmailOtp(
  email: string,
  name?: string | null
): Promise<SendEmailOtpResult> {
  const emailTrim = email.trim().toLowerCase();
  if (!emailTrim) {
    return { ok: false, error: "Email inválido" };
  }

  if (isInOtpCooldown(emailTrim)) {
    return { ok: true, cooldown: true };
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
    name?.trim() || user?.name || emailTrim.split("@")[0],
    code
  );

  if (!sent) {
    return {
      ok: false,
      error: "No se pudo enviar el código. Intenta de nuevo.",
    };
  }

  markOtpSent(emailTrim);
  return { ok: true, cooldown: false };
}
