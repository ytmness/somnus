import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams =
      typeof (params as any)?.then === "function"
        ? await (params as Promise<{ id: string }>)
        : (params as { id: string });
    const eventId = resolvedParams.id;

    if (!eventId) {
      return NextResponse.json({ error: "Evento no proporcionado" }, { status: 400 });
    }

    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = (await request.json()) as {
      inviteToken?: string;
      isPool?: boolean;
    };

    const inviteToken = (body.inviteToken ?? "").trim();
    const isPoolHint = !!body.isPool;

    if (!inviteToken) {
      return NextResponse.json({ error: "inviteToken requerido" }, { status: 400 });
    }

    // 1) Cancelar pool (link compartido) si aplica
    if (isPoolHint) {
      const pool = await prisma.tableInvitePool.findUnique({
        where: { inviteToken },
        select: { id: true, eventId: true },
      });

      if (!pool) {
        return NextResponse.json({ error: "Pool no encontrado" }, { status: 404 });
      }
      if (pool.eventId !== eventId) {
        return NextResponse.json({ error: "Pool no pertenece a este evento" }, { status: 400 });
      }

      // Cancelar solo pendientes (no tocar PAID)
      const pendingSlots = await prisma.tableSlotInvite.findMany({
        where: { poolId: pool.id, status: { in: ["PENDING", "EXPIRED", "CANCELLED"] } },
        select: { id: true },
      });

      if (pendingSlots.length > 0) {
        await prisma.tableSlotInvite.updateMany({
          where: { poolId: pool.id, id: { in: pendingSlots.map((s) => s.id) } },
          data: { status: "CANCELLED" },
        });

        // Cancelar ventas pendientes asociadas a esos slots (si existen)
        await prisma.sale.updateMany({
          where: { tableSlotInviteId: { in: pendingSlots.map((s) => s.id) } },
          data: { status: "CANCELLED" },
        });
      }

      // Borrar el pool para que el link compartido quede 404/inusable
      await prisma.tableInvitePool.delete({ where: { id: pool.id } });

      return NextResponse.json({ success: true, message: "Mesa cancelada" });
    }

    // 2) Cancelar slot (link por asiento)
    const slot = await prisma.tableSlotInvite.findUnique({
      where: { inviteToken },
      select: { id: true, eventId: true, status: true, poolId: true },
    });

    if (!slot) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }
    if (slot.eventId !== eventId) {
      return NextResponse.json({ error: "Invitación no pertenece a este evento" }, { status: 400 });
    }
    if (slot.status === "PAID") {
      return NextResponse.json(
        { error: "No se puede cancelar una invitación ya pagada" },
        { status: 400 }
      );
    }

    // Marcar como cancelado e invalidar link
    await prisma.tableSlotInvite.update({
      where: { id: slot.id },
      data: { status: "CANCELLED" },
    });

    await prisma.sale.updateMany({
      where: { tableSlotInviteId: slot.id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true, message: "Link cancelado" });
  } catch (error) {
    console.error("[Admin cancel invites] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Error al cancelar la invitación", details: message },
      { status: 500 }
    );
  }
}

