import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  invitePoolMinToConfirm,
  isMesaTicketType,
  tableCupos,
  tablePricePerCupo,
  effectiveTicketPriceAt,
} from "@/lib/ticket-pricing";

export const dynamic = "force-dynamic";

/**
 * GET /api/events/[id]/tables
 * Somnus: mesas = links con nombre (TableInvitePool), no plano con filas legacy.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        ticketTypes: {
          include: { pricePhases: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const now = new Date();
    const tableTypes = event.ticketTypes.filter(
      (tt) => tt.isActive !== false && isMesaTicketType(tt)
    );

    if (tableTypes.length === 0) {
      return NextResponse.json(
        {
          error: "Este evento no tiene tipos de mesa",
          details:
            "Agrega un boleto tipo Mesa (precio + cupos) en el evento. Las mesas concretas se crean como links en Admin.",
        },
        { status: 404 }
      );
    }

    const pools = await prisma.tableInvitePool.findMany({
      where: { eventId: params.id },
      orderBy: { tableNumber: "asc" },
      include: {
        ticketType: {
          select: {
            id: true,
            name: true,
            kind: true,
            isTable: true,
            tableCapacity: true,
            price: true,
          },
        },
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const tables = await Promise.all(
      pools.map(async (p) => {
        const paidCount = await prisma.tableSlotInvite.count({
          where: { poolId: p.id, status: "PAID" },
        });
        const minToConfirm = invitePoolMinToConfirm(p) ?? p.minPaidToConfirm;
        const cupos = tableCupos(p.ticketType?.tableCapacity ?? p.splitAmong);
        const unit = Number(p.pricePerSeat);
        const tablePrice =
          Number.isFinite(unit) && cupos > 0
            ? Math.round(unit * cupos * 100) / 100
            : unit;

        return {
          id: p.id,
          tableNumber: p.tableNumber,
          name: p.tableNumber,
          ticketTypeId: p.ticketTypeId,
          ticketTypeName: p.ticketType?.name ?? null,
          cupos,
          pricePerCupo: unit,
          tablePrice,
          paidCount,
          minPaidToConfirm: minToConfirm,
          tableConfirmed: paidCount >= minToConfirm,
          status:
            paidCount >= minToConfirm
              ? ("confirmed" as const)
              : paidCount > 0
                ? ("partial" as const)
                : ("open" as const),
          payUrl: `${baseUrl}/eventos/${params.id}/mesa/${encodeURIComponent(p.tableNumber)}/pagar/${p.inviteToken}`,
          expiresAt: p.expiresAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        model: "invite_links",
        tables,
        ticketTypes: tableTypes.map((tt) => {
          const price = effectiveTicketPriceAt(
            Number(tt.price),
            tt.pricePhases,
            now
          );
          const cupos = tableCupos(tt.tableCapacity);
          return {
            id: tt.id,
            name: tt.name,
            tablePrice: price,
            cupos,
            pricePerCupo: tablePricePerCupo(price, cupos),
            maxQuantity: tt.maxQuantity,
            soldQuantity: tt.soldQuantity,
          };
        }),
      },
    });
  } catch (error) {
    console.error("Get tables error:", error);
    return NextResponse.json(
      { error: "Error al obtener mesas" },
      { status: 500 }
    );
  }
}
