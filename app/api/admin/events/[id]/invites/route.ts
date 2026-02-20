import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/events/[id]/invites
 * Listar todos los invites de mesas de un evento (solo ADMIN)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const invites = await prisma.tableSlotInvite.findMany({
      where: { eventId: params.id },
      orderBy: [{ tableNumber: "asc" }, { seatNumber: "asc" }],
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const data = invites.map((inv) => ({
      id: inv.id,
      tableNumber: inv.tableNumber,
      seatNumber: inv.seatNumber,
      invitedName: inv.invitedName,
      invitedEmail: inv.invitedEmail,
      invitedPhone: inv.invitedPhone,
      status: inv.status,
      paidAt: inv.paidAt?.toISOString() ?? null,
      pricePerSeat: Number(inv.pricePerSeat),
      url: `${baseUrl}/eventos/${params.id}/mesa/${inv.tableNumber}/pagar/${inv.inviteToken}`,
      inviteToken: inv.inviteToken,
      expiresAt: inv.expiresAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: { event, invites: data },
    });
  } catch (error) {
    console.error("[Admin invites] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener invitaciones" },
      { status: 500 }
    );
  }
}
