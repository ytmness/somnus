import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/lib/auth/session";

/**
 * ¿Puede este usuario ver/descargar este boleto?
 *
 * Misma regla que /api/tickets/my-tickets: el boleto es del usuario si la venta
 * coincide por email (insensible a mayúsculas) o por userId. Los ADMIN pueden
 * acceder a cualquiera para soporte.
 */
export async function userOwnsTicket(
  user: SessionUser,
  ticketId: string
): Promise<boolean> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { sale: { select: { buyerEmail: true, userId: true } } },
  });

  if (!ticket) return false;
  if (user.role === "ADMIN") return true;

  const { sale } = ticket;
  const sameEmail =
    !!user.email &&
    sale.buyerEmail.trim().toLowerCase() === user.email.trim().toLowerCase();

  return sameEmail || sale.userId === user.id;
}
