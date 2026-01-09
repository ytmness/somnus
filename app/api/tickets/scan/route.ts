import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { parseQRPayload } from "@/lib/services/qr-generator";

// Marcar como dinámica porque usa cookies
export const dynamic = 'force-dynamic';

/**
 * POST /api/tickets/scan
 * Escanear y validar un boleto mediante código QR
 * Solo usuarios con rol ACCESOS pueden acceder
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Verificar rol ACCESOS (o ADMIN para pruebas)
    if (!hasRole(user, ["ACCESOS", "ADMIN"])) {
      return NextResponse.json(
        { error: "No tienes permisos para escanear boletos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { qrData } = body;

    if (!qrData) {
      return NextResponse.json(
        { error: "Código QR requerido" },
        { status: 400 }
      );
    }

    // Parsear el payload del QR
    const payload = parseQRPayload(qrData);
    
    // Si el payload no es válido, intentar buscar directamente por qrCode
    const qrCode = payload?.qrHash || qrData;

    // Buscar el boleto por qrCode
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        ticketType: {
          include: {
            event: true,
          },
        },
        sale: true,
      },
    });

    // Obtener información del dispositivo
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const deviceInfo = userAgent.substring(0, 200); // Limitar longitud

    // QR inválido - no existe el boleto
    if (!ticket) {
      // Registrar intento de escaneo inválido
      await prisma.ticketScan.create({
        data: {
          ticketId: "00000000-0000-0000-0000-000000000000", // ID placeholder
          scannedBy: user.id,
          result: "INVALID",
          notes: "QR no corresponde a ningún boleto",
          deviceInfo,
        },
      }).catch(() => {
        // Si falla por FK constraint, solo log
        console.error("No se pudo registrar escaneo inválido");
      });

      return NextResponse.json({
        success: false,
        result: "INVALID",
        message: "Código QR inválido o no existe",
      });
    }

    // Usar transacción para evitar race conditions
    const scanResult = await prisma.$transaction(async (tx) => {
      // Verificar estado del boleto
      if (ticket.status === "CANCELLED") {
        // Registrar intento de escaneo de boleto cancelado
        await tx.ticketScan.create({
          data: {
            ticketId: ticket.id,
            scannedBy: user.id,
            result: "CANCELLED",
            notes: "Intento de usar boleto cancelado",
            deviceInfo,
          },
        });

        return {
          success: false,
          result: "CANCELLED",
          message: "Este boleto ha sido cancelado",
          ticket: {
            ticketNumber: ticket.ticketNumber,
            event: ticket.ticketType.event.name,
            buyer: ticket.sale.buyerName,
          },
        };
      }

      if (ticket.status === "USED") {
        // Registrar intento de re-escaneo
        await tx.ticketScan.create({
          data: {
            ticketId: ticket.id,
            scannedBy: user.id,
            result: "ALREADY_USED",
            notes: `Ya fue escaneado el ${ticket.scannedAt?.toLocaleString("es-MX")}`,
            deviceInfo,
          },
        });

        return {
          success: false,
          result: "ALREADY_USED",
          message: "Este boleto ya fue utilizado",
          ticket: {
            ticketNumber: ticket.ticketNumber,
            event: ticket.ticketType.event.name,
            buyer: ticket.sale.buyerName,
            scannedAt: ticket.scannedAt,
            scannedBy: ticket.scannedBy,
          },
        };
      }

      // Boleto VÁLIDO - Actualizar a USED
      const now = new Date();
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "USED",
          scannedAt: now,
          scannedBy: user.id,
        },
      });

      // Registrar escaneo exitoso
      await tx.ticketScan.create({
        data: {
          ticketId: ticket.id,
          scannedBy: user.id,
          result: "SUCCESS",
          notes: "Acceso concedido",
          deviceInfo,
        },
      });

      // Registrar en audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "TICKET_SCANNED",
          entityType: "Ticket",
          entityId: ticket.id,
          changes: {
            ticketNumber: ticket.ticketNumber,
            event: ticket.ticketType.event.name,
            previousStatus: "VALID",
            newStatus: "USED",
          },
        },
      });

      return {
        success: true,
        result: "SUCCESS",
        message: "¡Acceso concedido!",
        ticket: {
          ticketNumber: ticket.ticketNumber,
          event: ticket.ticketType.event.name,
          artist: ticket.ticketType.event.artist,
          venue: ticket.ticketType.event.venue,
          eventDate: ticket.ticketType.event.eventDate,
          ticketType: ticket.ticketType.name,
          category: ticket.ticketType.category,
          buyer: ticket.sale.buyerName,
          buyerEmail: ticket.sale.buyerEmail,
          tableNumber: ticket.tableNumber,
          seatNumber: ticket.seatNumber,
          scannedAt: now,
        },
      };
    });

    return NextResponse.json(scanResult);
  } catch (error) {
    console.error("Error al escanear boleto:", error);
    return NextResponse.json(
      { error: "Error al procesar el escaneo" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tickets/scan/stats
 * Obtener estadísticas de escaneos del día actual
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Verificar rol ACCESOS (o ADMIN)
    if (!hasRole(user, ["ACCESOS", "ADMIN"])) {
      return NextResponse.json(
        { error: "No tienes permisos para ver estadísticas" },
        { status: 403 }
      );
    }

    // Obtener fecha de hoy (inicio y fin del día)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Contar escaneos por resultado
    const [successCount, alreadyUsedCount, invalidCount, cancelledCount, totalScans] = await Promise.all([
      prisma.ticketScan.count({
        where: {
          result: "SUCCESS",
          scannedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.ticketScan.count({
        where: {
          result: "ALREADY_USED",
          scannedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.ticketScan.count({
        where: {
          result: "INVALID",
          scannedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.ticketScan.count({
        where: {
          result: "CANCELLED",
          scannedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.ticketScan.count({
        where: {
          scannedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        total: totalScans,
        successful: successCount,
        duplicates: alreadyUsedCount,
        invalid: invalidCount,
        cancelled: cancelledCount,
        date: today.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}

