import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

function makeCode(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${base || "REF"}${suffix}`;
}

/**
 * GET /api/referrals — código propio (crea si falta) + stats
 */
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    let referral = await prisma.referralCode.findUnique({
      where: { userId: user.id },
      include: {
        referrals: {
          select: {
            id: true,
            referredOrganizerId: true,
            startsAt: true,
            endsAt: true,
            revenueSharePct: true,
            totalEarned: true,
            isActive: true,
          },
        },
      },
    });

    if (!referral) {
      let code = makeCode(user.name || user.email);
      for (let i = 0; i < 5; i++) {
        const clash = await prisma.referralCode.findUnique({ where: { code } });
        if (!clash) break;
        code = makeCode(user.name || user.email);
      }
      referral = await prisma.referralCode.create({
        data: { userId: user.id, code },
        include: {
          referrals: {
            select: {
              id: true,
              referredOrganizerId: true,
              startsAt: true,
              endsAt: true,
              revenueSharePct: true,
              totalEarned: true,
              isActive: true,
            },
          },
        },
      });
    }

    const totalEarned = referral.referrals.reduce(
      (sum, r) => sum + Number(r.totalEarned || 0),
      0
    );
    const activeCount = referral.referrals.filter((r) => r.isActive).length;
    const appUrl = getAppUrl().replace(/\/$/, "");

    return NextResponse.json({
      success: true,
      data: {
        code: referral.code,
        shareUrl: `${appUrl}/register?ref=${encodeURIComponent(referral.code)}`,
        isActive: referral.isActive,
        referredCount: referral.referrals.length,
        activeReferrals: activeCount,
        totalEarned,
        estimatedMonthly: totalEarned, // histórico acumulado; UI aclara 15%/12m
        referrals: referral.referrals,
        program: {
          revenueSharePct: 15,
          durationMonths: 12,
        },
      },
    });
  } catch (error) {
    console.error("[referrals GET]", error);
    return NextResponse.json(
      { error: "Error al obtener referidos" },
      { status: 500 }
    );
  }
}
