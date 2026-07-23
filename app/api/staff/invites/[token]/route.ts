import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { acceptStaffInvite } from "@/lib/staff/memberships";

export const dynamic = "force-dynamic";

/**
 * GET /api/staff/invites/[token]
 * Ver detalle de invitación
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invite = await prisma.staffInvite.findUnique({
      where: { token: params.token },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        scope: invite.scope,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt,
        expired: invite.expiresAt < new Date(),
      },
    });
  } catch (error) {
    console.error("GET staff/invites/[token] error:", error);
    return NextResponse.json({ error: "Error al obtener invitación" }, { status: 500 });
  }
}

/**
 * POST /api/staff/invites/[token]/accept
 * Aceptar invitación (usuario autenticado)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
    }

    const result = await acceptStaffInvite(params.token, user.id, user.email);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.membership,
      staffRoles: [result.membership.role],
    });
  } catch (error) {
    console.error("POST staff/invites/[token]/accept error:", error);
    return NextResponse.json({ error: "Error al aceptar invitación" }, { status: 500 });
  }
}
