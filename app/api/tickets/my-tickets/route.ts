import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/supabase-auth";

// Marcar como dinámica porque usa cookies
export const dynamic = 'force-dynamic';

/**
 * GET /api/tickets/my-tickets
 * Obtener todos los boletos del cliente autenticado
 * Los boletos se buscan por el email del usuario (buyerEmail en Sale)
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener usuario de la sesión
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Si no es cliente, verificar que tenga permisos
    if (user.role !== "CLIENTE") {
      return NextResponse.json(
        { error: "Solo los clientes pueden ver sus boletos" },
        { status: 403 }
      );
    }

    // Buscar todas las ventas del cliente por email
    const sales = await prisma.sale.findMany({
      where: {
        buyerEmail: user.email,
        status: "COMPLETED", // Solo ventas completadas
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            artist: true,
            venue: true,
            eventDate: true,
            eventTime: true,
            imageUrl: true,
          },
        },
        tickets: {
          include: {
            ticketType: {
              select: {
                id: true,
                name: true,
                category: true,
                price: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Formatear respuesta
    const tickets = sales.flatMap((sale) =>
      sale.tickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        qrCode: ticket.qrCode,
        status: ticket.status,
        tableNumber: ticket.tableNumber,
        seatNumber: ticket.seatNumber,
        pdfUrl: ticket.pdfUrl,
        createdAt: ticket.createdAt,
        event: sale.event,
        ticketType: ticket.ticketType,
        sale: {
          id: sale.id,
          total: Number(sale.total),
          buyerName: sale.buyerName,
          buyerEmail: sale.buyerEmail,
          createdAt: sale.createdAt,
        },
      }))
    );

    return NextResponse.json({
      success: true,
      data: {
        tickets,
        totalTickets: tickets.length,
        totalSales: sales.length,
      },
    });
  } catch (error) {
    console.error("Get my tickets error:", error);
    return NextResponse.json(
      { error: "Error al obtener boletos" },
      { status: 500 }
    );
  }
}

