import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/invites/[token]
 * Obtener datos de una invitación por token (para página de pago)
 * Soporta: TableSlotInvite (link por asiento) o TableInvitePool (money pool - un link para toda la mesa)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const resolved = typeof (params as any)?.then === "function" ? await (params as Promise<{ token: string }>) : (params as { token: string });
    const { token } = resolved;

    if (!token) {
      return NextResponse.json({ error: "Token no proporcionado" }, { status: 400 });
    }

    // 1. Buscar en TableSlotInvite (link individual por asiento)
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
            address: true,
            imageUrl: true,
            artist: true,
          },
        },
      },
    });

    if (invite) {
      // Flujo: TableSlotInvite (link por asiento)
      return handleSlotInvite(invite);
    }

    // 2. Buscar en TableInvitePool (money pool - un link para toda la mesa)
    const pool = await prisma.tableInvitePool.findUnique({
      where: { inviteToken: token },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            eventTime: true,
            venue: true,
            address: true,
            imageUrl: true,
            artist: true,
          },
        },
      },
    });

    if (!pool) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (pool.expiresAt && new Date() > pool.expiresAt) {
      return NextResponse.json(
        { error: "Este link ha expirado" },
        { status: 400 }
      );
    }

    const paidCount = await prisma.tableSlotInvite.count({
      where: { poolId: pool.id, status: "PAID" },
    });
    const tableReserved = paidCount >= pool.maxSlots;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const payUrl = `${baseUrl}/eventos/${pool.eventId}/mesa/${pool.tableNumber}/pagar/${token}`;

    return NextResponse.json({
      success: true,
      data: {
        id: pool.id,
        token: pool.inviteToken,
        isPool: true,
        tableNumber: pool.tableNumber,
        seatNumber: null,
        pricePerSeat: Number(pool.pricePerSeat),
        maxSlots: pool.maxSlots,
        paidCount,
        eventId: pool.eventId,
        event: pool.event,
        payUrl,
        status: tableReserved ? "PAID" : "PENDING",
        tableReserved,
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

async function handleSlotInvite(invite: any) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const payUrl = `${baseUrl}/eventos/${invite.eventId}/mesa/${invite.tableNumber}/pagar/${invite.inviteToken}`;

  if (invite.expiresAt && new Date() > invite.expiresAt && invite.status === "PENDING") {
      await prisma.tableSlotInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Esta invitación ha expirado" },
        { status: 400 }
      );
    }

    if (invite.status === "EXPIRED") {
      return NextResponse.json(
        { error: "Esta invitación ha expirado" },
        { status: 400 }
      );
    }

    // Si ya está pagada: devolver datos para mostrar "Mesa reservada"
    if (invite.status === "PAID") {
      const sameTableCount = await prisma.tableSlotInvite.count({
        where: {
          eventId: invite.eventId,
          tableNumber: invite.tableNumber,
        },
      });
      const paidCount = await prisma.tableSlotInvite.count({
        where: {
          eventId: invite.eventId,
          tableNumber: invite.tableNumber,
          status: "PAID",
        },
      });
      const tableReserved = paidCount === sameTableCount && sameTableCount > 0;

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
          status: "PAID",
          tableReserved,
          paidCount,
          totalSlots: sameTableCount,
        },
      });
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { error: "Esta invitación no está disponible" },
        { status: 400 }
      );
    }

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
}
