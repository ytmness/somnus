import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { canSellTickets, getAccessibleEventIds } from "@/lib/auth/permissions";
import { generateQRHash } from "@/lib/services/qr-generator";
import { effectiveTicketPriceAt } from "@/lib/ticket-pricing";

export const dynamic = "force-dynamic";

/**
 * POST /api/vendedor/sales
 * Venta POS en efectivo/tarjeta física
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, items, buyerName, buyerEmail, buyerPhone, paymentMethod } =
      body;

    if (!eventId || !items?.length || !buyerName || !buyerEmail) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const canSell = await canSellTickets(user, eventId);
    if (!canSell) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: {
          where: { isActive: true },
          include: { pricePhases: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const now = new Date();
    let subtotal = 0;
    const saleItems: Array<{
      ticketTypeId: string;
      quantity: number;
      isTable: boolean;
      tableNumber?: string;
    }> = [];

    for (const item of items) {
      const tt = event.ticketTypes.find((t) => t.id === item.ticketTypeId);
      if (!tt) {
        return NextResponse.json({ error: "Tipo de boleto inválido" }, { status: 400 });
      }
      const unitPrice = effectiveTicketPriceAt(
        Number(tt.price),
        tt.pricePhases,
        now
      );
      const qty = Number(item.quantity) || 1;
      if (tt.soldQuantity + qty > tt.maxQuantity) {
        return NextResponse.json({ error: `Sin cupo para ${tt.name}` }, { status: 400 });
      }
      subtotal += unitPrice * qty;
      saleItems.push({
        ticketTypeId: tt.id,
        quantity: qty,
        isTable: !!item.isTable,
        tableNumber: item.tableNumber,
      });
    }

    const { tax, total } = { tax: 0, total: subtotal };

    const lastTicket = await prisma.ticket.findFirst({
      orderBy: { ticketNumber: "desc" },
      select: { ticketNumber: true },
    });
    let nextNum = lastTicket
      ? parseInt(lastTicket.ticketNumber.replace(/\D/g, ""), 10) + 1
      : 1;

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          eventId,
          userId: user.id,
          channel: "POS",
          status: "COMPLETED",
          subtotal,
          tax,
          total,
          buyerName,
          buyerEmail: buyerEmail.trim().toLowerCase(),
          buyerPhone: buyerPhone || null,
          paymentMethod: paymentMethod || "efectivo",
          paidAt: now,
          saleItems: {
            create: saleItems,
          },
        },
        include: { saleItems: true },
      });

      for (const si of saleItems) {
        const tt = event.ticketTypes.find((t) => t.id === si.ticketTypeId)!;
        await tx.ticketType.update({
          where: { id: tt.id },
          data: { soldQuantity: { increment: si.quantity } },
        });

        for (let i = 0; i < si.quantity; i++) {
          const ticketNumber = `SN-${String(nextNum++).padStart(6, "0")}`;
          const ticket = await tx.ticket.create({
            data: {
              saleId: created.id,
              ticketTypeId: tt.id,
              ticketNumber,
              qrCode: `pending-${ticketNumber}`,
              tableNumber: si.tableNumber,
              seatNumber: si.isTable ? i + 1 : undefined,
            },
          });
          const qrHash = generateQRHash(ticket.id);
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { qrCode: qrHash },
          });
        }
      }

      return created;
    });

    return NextResponse.json({ success: true, data: { saleId: sale.id, total } });
  } catch (error) {
    console.error("POST vendedor/sales error:", error);
    return NextResponse.json({ error: "Error al registrar venta" }, { status: 500 });
  }
}

/**
 * GET /api/vendedor/sales — eventos asignados al vendedor
 */
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const eventIds = await getAccessibleEventIds(user);

    if (eventIds !== "all" && eventIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const events = await prisma.event.findMany({
      where:
        eventIds === "all"
          ? { isActive: true }
          : { id: { in: eventIds }, isActive: true },
      include: {
        ticketTypes: {
          where: { isActive: true },
          include: { pricePhases: { orderBy: { sortOrder: "asc" } } },
        },
      },
      orderBy: { eventDate: "asc" },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error("GET vendedor/sales error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
