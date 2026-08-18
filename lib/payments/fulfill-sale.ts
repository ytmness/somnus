import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { generateQRHash } from "@/lib/services/qr-generator";
import { sendTicketsReceiptEmail } from "@/lib/services/tickets-email";
import { getAppUrl } from "@/lib/payments/config";

export interface FulfillSaleParams {
  saleId: string;
  provider: "stripe";
  providerPaymentId: string;
  providerStatus?: string;
  webhookEventId?: string;
  stripeChargeId?: string;
  stripeConnectedAccountId?: string;
}

export interface FulfillSaleResult {
  alreadyCompleted: boolean;
  saleId: string;
  ticketsCreated: number;
}

/**
 * Servicio idempotente de fulfillment post-pago.
 * Crea tickets, actualiza inventario, marca invites PAID, envía email.
 * Si la venta ya está COMPLETED, retorna sin duplicar.
 */
export async function fulfillSale(
  params: FulfillSaleParams
): Promise<FulfillSaleResult> {
  const {
    saleId,
    provider,
    providerPaymentId,
    providerStatus,
    webhookEventId,
    stripeChargeId,
    stripeConnectedAccountId,
  } = params;

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      event: true,
      saleItems: true,
      tableSlotInvite: true,
      tickets: true,
    },
  });

  if (!sale) {
    throw new Error(`Venta no encontrada: ${saleId}`);
  }

  if (sale.status === "COMPLETED") {
    await attemptSendReceiptEmail(saleId, sale);
    return { alreadyCompleted: true, saleId, ticketsCreated: sale.tickets.length };
  }

  if (sale.status !== "PENDING") {
    throw new Error(`Venta ${saleId} no está pendiente (status: ${sale.status})`);
  }

  if (!sale.saleItems?.length) {
    throw new Error(`Venta ${saleId} sin saleItems`);
  }

  const isInviteSale = !!sale.tableSlotInviteId;
  const invite = sale.tableSlotInvite;
  const eventPrefix = (sale.event?.name || "EVT").substring(0, 3).toUpperCase();
  let ticketsCreated = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of sale.saleItems) {
      const ticketType = await tx.ticketType.findUnique({
        where: { id: item.ticketTypeId },
      });
      if (!ticketType) continue;

      const qty =
        isInviteSale && invite
          ? Math.max(1, item.quantity)
          : item.isTable
            ? ticketType.seatsPerTable || 4
            : item.quantity;

      const typePrefix = (ticketType.name || "TKT").substring(0, 3).toUpperCase();

      for (let i = 0; i < qty; i++) {
        const seatNumber =
          isInviteSale && invite
            ? (invite.seatNumber ?? 0) + i
            : item.isTable
              ? i + 1
              : null;

        const ticketCount = await tx.ticket.count({
          where: { ticketTypeId: item.ticketTypeId },
        });
        const seq = String(ticketCount + 1).padStart(6, "0");
        const uniqueSuffix = crypto.randomBytes(3).toString("hex");
        const ticketNumber = `${eventPrefix}-${typePrefix}-${seq}-${uniqueSuffix}`;
        const tempQr = `tmp-${crypto.randomUUID()}`;

        const ticket = await tx.ticket.create({
          data: {
            saleId,
            ticketTypeId: item.ticketTypeId,
            ticketNumber,
            qrCode: tempQr,
            tableNumber: item.tableNumber || null,
            seatNumber,
          },
        });

        const qrHash = generateQRHash(ticket.id);
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { qrCode: qrHash },
        });

        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldQuantity: { increment: 1 } },
        });

        ticketsCreated++;
      }
    }

    await tx.sale.update({
      where: { id: saleId },
      data: {
        status: "COMPLETED",
        paymentMethod: provider,
        paymentProvider: provider,
        paymentId: providerPaymentId,
        providerStatus: providerStatus || "succeeded",
        paidAt: new Date(),
        ...(webhookEventId ? { lastWebhookEventId: webhookEventId } : {}),
        ...(stripeChargeId ? { stripeChargeId } : {}),
        ...(stripeConnectedAccountId
          ? { stripeConnectedAccountId }
          : {}),
      },
    });

    if (isInviteSale && invite) {
      const totalQty = sale.saleItems.reduce(
        (sum, si) => sum + (si.quantity || 0),
        0
      );
      const start = invite.seatNumber ?? 0;
      const end = start + Math.max(0, totalQty - 1);

      try {
        if (invite.poolId) {
          await tx.tableSlotInvite.updateMany({
            where: {
              poolId: invite.poolId,
              seatNumber: { gte: start, lte: end },
            },
            data: { status: "PAID", paidAt: new Date() },
          });
        } else {
          await tx.tableSlotInvite.update({
            where: { id: invite.id },
            data: {
              status: "PAID",
              invitedName: sale.buyerName,
              invitedEmail: sale.buyerEmail || null,
              invitedPhone: sale.buyerPhone || null,
              paidAt: new Date(),
            },
          });
        }
      } catch (inviteErr: unknown) {
        const msg =
          inviteErr instanceof Error ? inviteErr.message : String(inviteErr);
        if (
          msg.includes("paidAt") ||
          msg.includes("column") ||
          msg.includes("does not exist")
        ) {
          if (invite.poolId) {
            await tx.tableSlotInvite.updateMany({
              where: {
                poolId: invite.poolId,
                seatNumber: { gte: start, lte: end },
              },
              data: { status: "PAID" },
            });
          } else {
            await tx.tableSlotInvite.update({
              where: { id: invite.id },
              data: {
                status: "PAID",
                invitedName: sale.buyerName,
                invitedEmail: sale.buyerEmail || null,
                invitedPhone: sale.buyerPhone || null,
              },
            });
          }
        } else {
          throw inviteErr;
        }
      }
    }
  });

  await attemptSendReceiptEmail(saleId, sale);

  return { alreadyCompleted: false, saleId, ticketsCreated };
}

async function attemptSendReceiptEmail(
  saleId: string,
  sale: {
    buyerEmail: string;
    buyerName: string;
    buyerPhone: string | null;
    total: unknown;
    subtotal: unknown;
    tax: unknown;
    event?: { name: string } | null;
  }
) {
  const appUrl = getAppUrl();

  const locked = await prisma.sale.updateMany({
    where: { id: saleId, emailReceiptStatus: "NOT_SENT" },
    data: { emailReceiptStatus: "SENDING" },
  });
  if (locked.count === 0) return;

  try {
    const tickets = await prisma.ticket.findMany({
      where: { saleId },
      include: {
        ticketType: { include: { event: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!tickets.length) {
      throw new Error("No se encontraron tickets para enviar el recibo");
    }

    await sendTicketsReceiptEmail({
      saleId,
      buyerEmail: sale.buyerEmail,
      buyerName: sale.buyerName,
      buyerPhone: sale.buyerPhone,
      eventName: sale.event?.name || "Evento",
      appUrl,
      total: Number(sale.total),
      subtotal: Number(sale.subtotal),
      tax: Number(sale.tax),
      tickets: tickets as Parameters<typeof sendTicketsReceiptEmail>[0]["tickets"],
    });

    await prisma.sale.update({
      where: { id: saleId },
      data: {
        emailReceiptStatus: "SENT",
        emailReceiptSentAt: new Date(),
        emailReceiptError: null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[fulfill-sale] Error enviando recibo:", msg);
    await prisma.sale
      .update({
        where: { id: saleId },
        data: { emailReceiptStatus: "FAILED", emailReceiptError: msg },
      })
      .catch(() => {});
  }
}

/**
 * Marca una venta como reembolsada e invalida sus tickets.
 */
export async function reverseSale(saleId: string): Promise<void> {
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) throw new Error(`Venta no encontrada: ${saleId}`);
  if (sale.status === "REFUNDED") return;

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: saleId },
      data: { status: "REFUNDED", providerStatus: "refunded" },
    });
    await tx.ticket.updateMany({
      where: { saleId, status: "VALID" },
      data: { status: "CANCELLED" },
    });
  });
}
