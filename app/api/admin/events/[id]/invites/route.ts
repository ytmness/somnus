import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/session";
import { invitePoolMinToConfirm } from "@/lib/ticket-pricing";

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
      include: {
        ticketType: {
          select: { id: true, name: true, kind: true, isTable: true, tableCapacity: true },
        },
        coverTicketType: { select: { id: true, name: true } },
      },
    });

    const poolRows = await Promise.all(
      pools.map(async (p) => {
        const paidSlots = await prisma.tableSlotInvite.findMany({
          where: { poolId: p.id, status: "PAID" },
          select: { pricePerSeat: true },
        });
        const paidCount = paidSlots.length;
        const totalCollected = paidSlots.reduce(
          (sum, s) => sum + Number(s.pricePerSeat),
          0
        );
        const minToConfirm = invitePoolMinToConfirm(p) ?? p.minPaidToConfirm;
        const tableConfirmed = paidCount >= minToConfirm;
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
          url: `${baseUrl}/eventos/${eventId}/mesa/${encodeURIComponent(p.tableNumber)}/pagar/${p.inviteToken}`,
          expiresAt: p.expiresAt != null ? p.expiresAt.toISOString() : null,
          createdAt: p.createdAt.toISOString(),
          isPool: true,
          maxSlots: p.maxSlots,
          splitAmong: p.splitAmong,
          minPaidToConfirm: minToConfirm,
          paidCount,
          totalCollected,
          tableConfirmed,
          poolMode:
            p.mode === "FULL_TABLE" || p.maxSlots === 1
              ? "FULL_TABLE"
              : "MONEY_POOL",
          ticketTypeName: p.ticketType?.name ?? null,
          ticketTypeId: p.ticketTypeId,
          coverTicketName: p.coverTicketType?.name ?? null,
          coverTicketTypeId: p.coverTicketTypeId,
        };
      })
    );

    type InviteRow = {
      id: string;
      tableNumber: string;
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
      totalCollected?: number;
    };

    let invites: InviteRow[];

    try {
      invites = await prisma.tableSlotInvite.findMany({
        where: { eventId, status: { not: "CANCELLED" } },
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
          where: { eventId, status: { not: "CANCELLED" } },
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

    // Solo slots sueltos (link por asiento). Los del pool ya viven en poolRows;
    // si los listamos otra vez parece que la mesa no se “guardó” bien.
    const standalone = invites.filter((inv) => !inv.poolId);
    const data = standalone.map((inv) => {
      const url = `${baseUrl}/eventos/${eventId}/mesa/${encodeURIComponent(inv.tableNumber)}/pagar/${inv.inviteToken}`;
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
        totalCollected: inv.status === "PAID" ? Number(inv.pricePerSeat) : 0,
        url,
        inviteToken: inv.inviteToken,
        expiresAt: inv.expiresAt != null ? inv.expiresAt.toISOString() : null,
        createdAt: inv.createdAt.toISOString(),
        isPool: false,
      };
    });

    const combinedInvites = [...poolRows, ...data].sort((a, b) => {
      const cmp = String(a.tableNumber).localeCompare(String(b.tableNumber), "es", {
        numeric: true,
        sensitivity: "base",
      });
      if (cmp !== 0) return cmp;
      if (a.isPool !== b.isPool) return a.isPool ? -1 : 1;
      return (a.seatNumber ?? 0) - (b.seatNumber ?? 0);
    });

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
