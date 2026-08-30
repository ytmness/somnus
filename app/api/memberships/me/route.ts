import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/memberships/me — membresías ACTIVE del usuario
 */
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const memberships = await prisma.orgMembership.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            priceCents: true,
            currency: true,
            interval: true,
            earlyAccessHours: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: memberships });
  } catch (error) {
    console.error("[memberships me]", error);
    return NextResponse.json(
      { error: "Error al listar membresías" },
      { status: 500 }
    );
  }
}
