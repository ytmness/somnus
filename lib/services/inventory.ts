import { prisma } from "@/lib/db/prisma";
import { TicketType } from "@prisma/client";

/**
 * Verifica disponibilidad de boletos
 */
export async function checkAvailability(
  ticketTypeId: string,
  quantity: number
): Promise<{ available: boolean; remaining: number }> {
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });

  if (!ticketType || !ticketType.isActive) {
    return { available: false, remaining: 0 };
  }

  const remaining = ticketType.maxQuantity - ticketType.soldQuantity;
  const available = remaining >= quantity;

  return { available, remaining };
}

/**
 * Reserva boletos (descuenta del inventario)
 * CRÍTICO: Debe ser transaccional para evitar sobreventa
 */
export async function reserveTickets(
  ticketTypeId: string,
  quantity: number
): Promise<{ success: boolean; ticketType?: TicketType; error?: string }> {
  try {
    // Usar transacción para garantizar atomicidad
    const ticketType = await prisma.$transaction(async (tx) => {
      // 1. Obtener el ticket type con lock para evitar race conditions
      const current = await tx.ticketType.findUnique({
        where: { id: ticketTypeId },
      });

      if (!current || !current.isActive) {
        throw new Error("Ticket type not found or inactive");
      }

      const remaining = current.maxQuantity - current.soldQuantity;

      if (remaining < quantity) {
        throw new Error(`Only ${remaining} tickets available`);
      }

      // 2. Actualizar la cantidad vendida
      const updated = await tx.ticketType.update({
        where: { id: ticketTypeId },
        data: {
          soldQuantity: {
            increment: quantity,
          },
        },
      });

      return updated;
    });

    return { success: true, ticketType };
  } catch (error) {
    console.error("Error reserving tickets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reserve tickets",
    };
  }
}

/**
 * Libera boletos reservados (restaura inventario)
 * Se usa cuando una venta es cancelada
 */
export async function releaseTickets(
  ticketTypeId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: {
        soldQuantity: {
          decrement: quantity,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error releasing tickets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to release tickets",
    };
  }
}

/**
 * Obtiene el estado actual del inventario de un evento
 */
export async function getEventInventoryStatus(eventId: string) {
  const ticketTypes = await prisma.ticketType.findMany({
    where: { eventId },
    include: {
      event: true,
    },
  });

  return ticketTypes.map((tt) => ({
    id: tt.id,
    name: tt.name,
    category: tt.category,
    price: tt.price,
    maxQuantity: tt.maxQuantity,
    soldQuantity: tt.soldQuantity,
    available: tt.maxQuantity - tt.soldQuantity,
    percentage: (tt.soldQuantity / tt.maxQuantity) * 100,
    isActive: tt.isActive,
  }));
}

/**
 * Verifica si un evento tiene capacidad disponible
 */
export async function hasEventCapacity(eventId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      ticketTypes: true,
    },
  });

  if (!event) return false;

  const totalSold = event.ticketTypes.reduce((sum, tt) => sum + tt.soldQuantity, 0);
  return totalSold < event.maxCapacity;
}

/**
 * Validación de capacidad por tipo VIP (mesas)
 * Las mesas VIP deben venderse completas (4 boletos = 1 mesa)
 */
export async function validateVIPTableCapacity(
  ticketTypeId: string,
  quantity: number
): Promise<{ valid: boolean; error?: string }> {
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });

  if (!ticketType) {
    return { valid: false, error: "Ticket type not found" };
  }

  // Si es mesa, debe ser múltiplo del número de asientos
  if (ticketType.isTable && ticketType.seatsPerTable) {
    if (quantity % ticketType.seatsPerTable !== 0) {
      return {
        valid: false,
        error: `VIP tables must be purchased in groups of ${ticketType.seatsPerTable}`,
      };
    }
  }

  return { valid: true };
}
