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

    // Obtener pools (links compartidos tipo money pool)
    const pools = await prisma.tableInvitePool.findMany({
      where: { eventId },
      orderBy: { tableNumber: "asc" },
    });

    const poolRows = await Promise.all(
      pools.map(async (p) => {
        const paidCount = await prisma.tableSlotInvite.count({
          where: { poolId: p.id, status: "PAID" },
        });
        return {
          id: p.id,
          tableNumber: p.tableNumber,
          seatNumber: null as number | null,
          invitedName: "Link compartido",
          invitedEmail: null as string | null,
          invitedPhone: null as string | null,
          status: "POOL",
          paidAt: null as string | null,
          pricePerSeat: Number(p.pricePerSeat),
          inviteToken: p.inviteToken,
          url: `${baseUrl}/eventos/${eventId}/mesa/${p.tableNumber}/pagar/${p.inviteToken}`,
          expiresAt: p.expiresAt != null ? p.expiresAt.toISOString() : null,
          createdAt: p.createdAt.toISOString(),
          isPool: true,
          maxSlots: p.maxSlots,
          paidCount,
        };
      })
    );

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
      poolId?: string | null;
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
          poolId: true,
        },
      }) as (InviteRow & { poolId?: string | null })[];
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
            poolId: true,
          },
        }) as InviteRow[];
      } else {
        throw err;
      }
    }

    const poolById = new Map(pools.map((p) => [p.id, p]));
    const data = invites.map((inv) => {
      const url =
        inv.poolId && poolById.has(inv.poolId)
          ? `${baseUrl}/eventos/${eventId}/mesa/${inv.tableNumber}/pagar/${poolById.get(inv.poolId)!.inviteToken}`
          : `${baseUrl}/eventos/${eventId}/mesa/${inv.tableNumber}/pagar/${inv.inviteToken}`;
      return {
        id: inv.id,
        tableNumber: inv.tableNumber,
        seatNumber: inv.seatNumber,
        invitedName: inv.invitedName,
        invitedEmail: inv.invitedEmail,
        invitedPhone: inv.invitedPhone,
        status: inv.status,
        paidAt: inv.paidAt != null ? inv.paidAt.toISOString() : null,
        pricePerSeat: Number(inv.pricePerSeat),
        url,
        inviteToken: inv.inviteToken,
        expiresAt: inv.expiresAt != null ? inv.expiresAt.toISOString() : null,
        createdAt: inv.createdAt.toISOString(),
        isPool: false,
      };
    });

    const combinedInvites = [...poolRows, ...data].sort(
      (a, b) => a.tableNumber - b.tableNumber || (a.seatNumber ?? 0) - (b.seatNumber ?? 0)
    );

    return NextResponse.json({
      success: true,
      data: { event, invites: combinedInvites },
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
