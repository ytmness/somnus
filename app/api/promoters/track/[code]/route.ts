import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAppUrl } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

type RouteCtx = { params: { code: string } };

/**
 * GET /api/promoters/track/[code]
 * Incrementa clickCount y redirige a boletos del evento con ?promoter=code
 */
export async function GET(_request: NextRequest, { params }: RouteCtx) {
  const code = decodeURIComponent(params.code || "").trim().toUpperCase();
  const appUrl = getAppUrl().replace(/\/$/, "");

  if (!code) {
    return NextResponse.redirect(`${appUrl}/`);
  }

  const link = await prisma.promoterLink.findFirst({
    where: { code, isActive: true },
    select: { id: true, eventId: true, code: true },
  });

  if (!link) {
    return NextResponse.redirect(`${appUrl}/`);
  }

  await prisma.promoterLink
    .update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    })
    .catch((err) => console.error("[promoter track]", err));

  const dest = `${appUrl}/eventos/${link.eventId}/boletos?promoter=${encodeURIComponent(link.code)}`;
  return NextResponse.redirect(dest);
}
