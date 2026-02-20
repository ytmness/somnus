import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/invites/[token]
 * Obtener datos de una invitación por token (para página de pago)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: "Token no proporcionado" }, { status: 400 });
    }

    const invite = await prisma.tableSlotInvite.findUnique({
      where: { inviteToken: token },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            eventTime: true,
            venue: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        {
          error:
          invite.status === "PAID"
            ? "Esta invitación ya fue pagada"
            : invite.status === "EXPIRED"
            ? "Esta invitación ha expirado"
            : "Esta invitación no está disponible",
        },
        { status: 400 }
      );
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      await prisma.tableSlotInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Esta invitación ha expirado" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const payUrl = `${baseUrl}/eventos/${invite.eventId}/mesa/${invite.tableNumber}/pagar/${token}`;

    return NextResponse.json({
      success: true,
      data: {
        id: invite.id,
        token: invite.inviteToken,
        invitedName: invite.invitedName,
        invitedEmail: invite.invitedEmail,
        invitedPhone: invite.invitedPhone,
        tableNumber: invite.tableNumber,
        seatNumber: invite.seatNumber,
        pricePerSeat: Number(invite.pricePerSeat),
        eventId: invite.eventId,
        event: invite.event,
        payUrl,
      },
    });
  } catch (error) {
    console.error("[Invites token GET] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener invitación" },
      { status: 500 }
    );
  }
}
