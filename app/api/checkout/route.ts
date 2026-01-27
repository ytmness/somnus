import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/supabase-auth";
import { generateQRHash, generateQRPayload } from "@/lib/services/qr-generator";

// Marcar como dinámica porque usa cookies
export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout
 * Crear una orden/venta desde el carrito
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, items, buyerName, buyerEmail, buyerPhone, paymentMethod } = body;

    // Validar datos requeridos
    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Datos inválidos: se requiere eventId e items" },
        { status: 400 }
      );
    }

    if (!buyerName || !buyerEmail) {
      return NextResponse.json(
        { error: "Se requiere nombre y email del comprador" },
        { status: 400 }
      );
    }

    // Verificar que el evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    // Calcular totales
    let subtotal = 0;
    const ticketDetails: Array<{
      ticketTypeId: string;
      quantity: number;
      tableNumber?: string;
    }> = [];

    for (const item of items) {
      if (item.table) {
        // Es una mesa VIP
        const ticketType = event.ticketTypes.find(
          (tt) => tt.isTable === true && Number(tt.price) === item.table.price
        );

        if (!ticketType) {
          return NextResponse.json(
            { error: `Tipo de boleto no encontrado para mesa ${item.table.number}` },
            { status: 400 }
          );
        }

        // Verificar disponibilidad
        if (ticketType.soldQuantity >= ticketType.maxQuantity) {
          return NextResponse.json(
            { error: `No hay disponibilidad para mesa ${item.table.number}` },
            { status: 400 }
          );
        }

        subtotal += Number(ticketType.price);
        ticketDetails.push({
          ticketTypeId: ticketType.id,
          quantity: 1,
          tableNumber: `Mesa ${item.table.number}`,
        });
      } else if (item.section && item.quantity) {
        // Es una sección (GENERAL, PREFERENTE)
        const ticketType = event.ticketTypes.find(
          (tt) => tt.id === item.section.id || tt.name === item.section.name
        );

        if (!ticketType) {
          return NextResponse.json(
            { error: `Tipo de boleto no encontrado para ${item.section.name}` },
            { status: 400 }
          );
        }

        // Verificar disponibilidad
        const available = ticketType.maxQuantity - ticketType.soldQuantity;
        if (item.quantity > available) {
          return NextResponse.json(
            { error: `Solo hay ${available} boletos disponibles para ${item.section.name}` },
            { status: 400 }
          );
        }

        subtotal += Number(ticketType.price) * item.quantity;
        ticketDetails.push({
          ticketTypeId: ticketType.id,
          quantity: item.quantity,
        });
      }
    }

    const tax = subtotal * 0.16; // IVA 16%
    const total = subtotal + tax;

    // Obtener usuario si está autenticado
    const user = await getSession();
    const userId = user?.id || null;

    // Crear la venta
    const sale = await prisma.sale.create({
      data: {
        eventId,
        userId,
        channel: "ONLINE",
        status: paymentMethod === "simulado" ? "COMPLETED" : "PENDING",
        subtotal: subtotal,
        tax: tax,
        total: total,
        buyerName,
        buyerEmail,
        buyerPhone: buyerPhone || null,
        paymentMethod: paymentMethod || "simulado",
        paidAt: paymentMethod === "simulado" ? new Date() : null,
      },
    });

    // Crear los boletos
    const tickets = [];
    for (const detail of ticketDetails) {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: detail.ticketTypeId },
      });

      if (!ticketType) continue;

      // Para mesas, crear un ticket por cada asiento (seatsPerTable)
      // Para secciones normales, crear según quantity
      const ticketsToCreate = detail.tableNumber 
        ? (ticketType.seatsPerTable || 4) // Para mesas: crear tickets por asientos
        : detail.quantity; // Para secciones: crear según cantidad

      for (let i = 0; i < ticketsToCreate; i++) {
        // Generar número de boleto único
        const ticketCount = await prisma.ticket.count({
          where: { ticketTypeId: detail.ticketTypeId },
        });
        const ticketNumber = `${event.name.substring(0, 3).toUpperCase()}-${ticketType.name.substring(0, 3).toUpperCase()}-${String(ticketCount + 1).padStart(6, "0")}`;

        // Crear ticket primero para obtener el ID
        const ticket = await prisma.ticket.create({
          data: {
            saleId: sale.id,
            ticketTypeId: detail.ticketTypeId,
            ticketNumber,
            qrCode: "TEMP", // Temporal, se actualizará después
            tableNumber: detail.tableNumber || null,
            seatNumber: detail.tableNumber ? i + 1 : null, // Para mesas: 1, 2, 3, 4
          },
        });

        // Generar QR único con hash SHA-256
        const qrHash = generateQRHash(ticket.id);
        const qrPayload = generateQRPayload(ticket.id, qrHash);
        
        // Actualizar ticket con el QR real
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { qrCode: qrHash },
        });

        tickets.push(ticket);

        // Actualizar cantidad vendida del ticketType
        await prisma.ticketType.update({
          where: { id: detail.ticketTypeId },
          data: {
            soldQuantity: {
              increment: 1,
            },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Orden creada exitosamente",
      data: {
        sale,
        tickets,
      },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Error al procesar la orden" },
      { status: 500 }
    );
  }
}


