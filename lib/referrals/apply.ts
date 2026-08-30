import { prisma } from "@/lib/db/prisma";

/**
 * Crea ReferralAttribution para un usuario referido (idempotente).
 * referredOrganizerId = User.id del referido.
 */
export async function applyReferralCodeForUser(
  userId: string,
  codeRaw: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: "Código requerido", status: 400 };
  }

  const referralCode = await prisma.referralCode.findUnique({
    where: { code },
  });
  if (!referralCode || !referralCode.isActive) {
    return { ok: false, error: "Código de referido inválido", status: 404 };
  }
  if (referralCode.userId === userId) {
    return { ok: false, error: "No puedes usar tu propio código", status: 400 };
  }

  const existing = await prisma.referralAttribution.findUnique({
    where: { referredOrganizerId: userId },
  });
  if (existing) {
    return { ok: true };
  }

  const endsAt = new Date();
  endsAt.setFullYear(endsAt.getFullYear() + 1);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { referredByCode: code },
    }),
    prisma.referralAttribution.create({
      data: {
        referralCodeId: referralCode.id,
        referredOrganizerId: userId,
        endsAt,
        revenueSharePct: 15,
        isActive: true,
      },
    }),
  ]);

  return { ok: true };
}
