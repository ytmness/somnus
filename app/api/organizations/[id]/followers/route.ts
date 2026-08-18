import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { userOwnsOrganization } from "@/lib/auth/event-access";

export const dynamic = "force-dynamic";

/**
 * GET /api/organizations/[id]/followers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const owns = await userOwnsOrganization(user, params.id);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      prisma.organizationFollow.findMany({
        where: { organizationId: params.id },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.organizationFollow.count({ where: { organizationId: params.id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: followers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET followers error:", error);
    return NextResponse.json({ error: "Error al obtener seguidores" }, { status: 500 });
  }
}
