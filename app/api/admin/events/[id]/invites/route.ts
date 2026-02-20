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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = typeof (params as any)?.then === "function" ? await (params as Promise<{ id: string }>) : (params as { id: string });
    const eventId = resolvedParams.id;

    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    type InviteRow = {
      id: string;
      tableNumber: number;
      seatNumber: number;
      invitedName: string;
      invitedEmail: string | null;
      invitedPhone: string | null;
      status: string;
      pricePerSeat: unknown;
      inviteToken: string;
      expiresAt: Date | null;
      createdAt: Date;
      paidAt?: Date | null;
    };

    let invites: InviteRow[];

    try {
      invites = await prisma.tableSlotInvite.findMany({
        where: { eventId },
        orderBy: [{ tableNumber: "asc" }, { seatNumber: "asc" }],
        select: {
          id: true,
          tableNumber: true,
          seatNumber: true,
          invitedName: true,
          invitedEmail: true,
          invitedPhone: true,
          status: true,
          pricePerSeat: true,
          inviteToken: true,
          expiresAt: true,
          createdAt: true,
          paidAt: true,
        },
      }) as InviteRow[];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("paidAt") || msg.includes("column") || msg.includes("does not exist")) {
        invites = await prisma.tableSlotInvite.findMany({
          where: { eventId },
          orderBy: [{ tableNumber: "asc" }, { seatNumber: "asc" }],
          select: {
            id: true,
            tableNumber: true,
            seatNumber: true,
            invitedName: true,
            invitedEmail: true,
            invitedPhone: true,
            status: true,
            pricePerSeat: true,
            inviteToken: true,
            expiresAt: true,
            createdAt: true,
          },
        }) as InviteRow[];
      } else {
        throw err;
      }
    }

    const data = invites.map((inv) => ({
      id: inv.id,
      tableNumber: inv.tableNumber,
      seatNumber: inv.seatNumber,
      invitedName: inv.invitedName,
      invitedEmail: inv.invitedEmail,
      invitedPhone: inv.invitedPhone,
      status: inv.status,
      paidAt: inv.paidAt != null ? inv.paidAt.toISOString() : null,
      pricePerSeat: Number(inv.pricePerSeat),
      url: `${baseUrl}/eventos/${eventId}/mesa/${inv.tableNumber}/pagar/${inv.inviteToken}`,
      inviteToken: inv.inviteToken,
      expiresAt: inv.expiresAt != null ? inv.expiresAt.toISOString() : null,
      createdAt: inv.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: { event, invites: data },
    });
  } catch (error) {
    console.error("[Admin invites] Error:", error);
    const message = error instanceof Error ? error.message : "Error al obtener invitaciones";
    return NextResponse.json(
      {
        error: "Error al obtener invitaciones",
        ...(process.env.NODE_ENV === "development" && { details: message }),
      },
      { status: 500 }
    );
  }
}
