import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { createClipCharge } from "@/lib/payments/clip";
import { generateQRHash } from "@/lib/services/qr-generator";
import { sendTicketsReceiptEmail } from "@/lib/services/tickets-email";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/clip/create-charge
 * Cobrar con token de Clip y crear tickets si paga
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.CLIP_AUTH_TOKEN) {
      console.error("Clip create-charge: CLIP_AUTH_TOKEN no configurado en .env");
      return NextResponse.json(
        { error: "Los pagos con tarjeta no están disponibles temporalmente. Contacta al administrador." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { saleId, token, customer } = body;
    console.info("[create-charge] request", {
      saleId: saleId || null,
      hasToken: Boolean(token),
      customerEmail: customer?.email || null,
      hasCustomerPhone: Boolean(customer?.phone),
    });

    if (!saleId || !token || !customer?.email) {
      console.warn("[create-charge] 400 campos faltantes", {
        saleId: saleId || null,
        hasToken: Boolean(token),
        customerEmail: customer?.email || null,
      });
      return NextResponse.json(
        { error: "Faltan saleId, token o customer.email" },
        { status: 400 }
      );
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { event: true, saleItems: true, tableSlotInvite: true },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const attemptSendReceiptEmailIfNeeded = async () => {
      // Candado anti-doble envío:
      // - Solo enviamos si el Sale está en NOT_SENT.
      // - Marcamos SENDING primero para que reintentos/concurrencia no reenvíen.
      const locked = await prisma.sale.updateMany({
        where: { id: saleId, emailReceiptStatus: "NOT_SENT" },
        data: { emailReceiptStatus: "SENDING" },
      });
      if (locked.count === 0) return;

      try {
        const tickets = await prisma.ticket.findMany({
          where: { saleId },
          include: {
            ticketType: {
              include: {
                event: true,
              },
            },
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
          tickets: tickets as any,
        });

        await prisma.sale.update({
          where: { id: saleId },
          data: {
            emailReceiptStatus: "SENT",
            emailReceiptSentAt: new Date(),
            emailReceiptError: null,
          },
        });
      } catch (err: any) {
        const msg = err?.message || String(err);
        console.error("[create-charge] Error enviando recibo:", msg);

        await prisma.sale
          .update({
            where: { id: saleId },
            data: {
              emailReceiptStatus: "FAILED",
              emailReceiptError: msg,
            },
          })
          .catch(() => {
            // No bloqueamos el endpoint si falló el update de estado
          });
      }
    };

    if (sale.status === "COMPLETED") {
      // Idempotencia: si el frontend reintenta (doble click / retry),
      // no regresemos 400; respondemos success para que no se quede
      // el usuario en pantalla de tarjeta.
      console.info("[create-charge] sale ya COMPLETED, devolviendo idempotente", { saleId });
      await attemptSendReceiptEmailIfNeeded();
      return NextResponse.json({
        success: true,
        data: { saleId, paid: true, alreadyCompleted: true },
      });
    }

    const totalAmount = Number(sale.total);
    const description = `${sale.event?.name || "Evento"} - Somnus`;

    const clipRes = await createClipCharge(
      saleId,
      totalAmount,
      token,
      customer,
      description
    );

    // Clip devuelve status: "approved" o "captured"/"completed"; paid/paid_amount
    const isPaid =
      clipRes?.paid === true ||
      clipRes?.status === "approved" ||
      clipRes?.status === "captured" ||
      clipRes?.status === "completed" ||
      clipRes?.status === "paid";
    if (!isPaid) {
      console.warn("[create-charge] Pago no completado por Clip:", {
        saleId,
        clipId: clipRes?.id,
        status: clipRes?.status,
        paid: clipRes?.paid,
        paidAmount: (clipRes as any)?.paid_amount,
      });
      return NextResponse.json(
        {
          error: "El pago no se completó",
          status: clipRes?.status || "unknown",
        },
        { status: 400 }
      );
    }

    if (!sale.saleItems?.length) {
      console.error("Clip create-charge: saleItems vacío para saleId", saleId);
      return NextResponse.json(
        { error: "Error en la orden: no hay ítems. Contacta al administrador." },
        { status: 400 }
      );
    }

    // Crear tickets desde saleItems
    const isInviteSale = !!sale.tableSlotInviteId;
    const invite = sale.tableSlotInvite;

    const eventPrefix = (sale.event?.name || "EVT").substring(0, 3).toUpperCase();
    for (const item of sale.saleItems) {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: item.ticketTypeId },
      });
      if (!ticketType) continue;

      // Venta desde invite: 1 solo ticket con seatNumber del invite
      const qty =
        isInviteSale && invite
          ? Math.max(1, item.quantity)
          : item.isTable
            ? (ticketType.seatsPerTable || 4)
            : item.quantity;
      const typePrefix = (ticketType.name || "TKT").substring(0, 3).toUpperCase();

      for (let i = 0; i < qty; i++) {
        const seatNumber =
          isInviteSale && invite
            ? (invite.seatNumber ?? 0) + i
            : item.isTable
              ? i + 1
              : null;

        // ticketNumber debe ser único: secuencia + sufijo corto para evitar colisión si dos pagos a la vez
        const ticketCount = await prisma.ticket.count({
          where: { ticketTypeId: item.ticketTypeId },
        });
        const seq = String(ticketCount + 1).padStart(6, "0");
        const uniqueSuffix = crypto.randomBytes(3).toString("hex");
        const ticketNumber = `${eventPrefix}-${typePrefix}-${seq}-${uniqueSuffix}`;

        // qrCode es @unique: valor temporal único, luego se actualiza al hash real
        const tempQr = `tmp-${crypto.randomUUID()}`;
        const ticket = await prisma.ticket.create({
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
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { qrCode: qrHash },
        });

        await prisma.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldQuantity: { increment: 1 } },
        });
      }
    }

    await prisma.sale.update({
      where: { id: saleId },
      data: {
        status: "COMPLETED",
        paymentMethod: "clip",
        paymentId: clipRes.id,
        paidAt: new Date(),
      },
    });

    await attemptSendReceiptEmailIfNeeded();

    if (isInviteSale && invite) {
      // Para money pool: cuando el usuario paga N asientos en un solo checkout,
      // los seatNumber consecutivos corresponden al rango [invite.seatNumber, invite.seatNumber + N - 1]
      // y se marcan como PAID sin sobrescribir invitedName/invitedEmail/invitedPhone.
      const totalQty = sale.saleItems.reduce((sum, si) => sum + (si.quantity || 0), 0);
      const start = invite.seatNumber ?? 0;
      const end = start + Math.max(0, totalQty - 1);

      try {
        if (invite.poolId) {
          await prisma.tableSlotInvite.updateMany({
            where: {
              poolId: invite.poolId,
              seatNumber: { gte: start, lte: end },
            },
            data: { status: "PAID", paidAt: new Date() },
          });
        } else {
          await prisma.tableSlotInvite.update({
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
      } catch (inviteErr: any) {
        const msg = inviteErr?.message || String(inviteErr);
        if (
          msg.includes("paidAt") ||
          msg.includes("column") ||
          msg.includes("does not exist")
        ) {
          if (invite.poolId) {
            await prisma.tableSlotInvite.updateMany({
              where: {
                poolId: invite.poolId,
                seatNumber: { gte: start, lte: end },
              },
              data: { status: "PAID" },
            });
          } else {
            await prisma.tableSlotInvite.update({
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

    return NextResponse.json({
      success: true,
      data: { saleId, paid: true },
    });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    const errCode = error?.code ?? "";
    console.error("[create-charge] Error:", errCode, errMsg, error?.stack);
    const isUnauthorized = /unauthorized/i.test(errMsg);
    const isConfigError = errMsg.includes("CLIP_AUTH_TOKEN") || errMsg.includes("no configurado");
    let status = 500;
    let clientMsg = errMsg;
    if (isConfigError) {
      status = 503;
      clientMsg = "Configuración de pagos incompleta. Contacta al administrador.";
    } else if (isUnauthorized) {
      status = 401;
      clientMsg = "Error de autenticación con Clip. El administrador debe verificar CLIP_AUTH_TOKEN.";
    }
    return NextResponse.json(
      { error: clientMsg || "Error al procesar pago" },
      { status }
    );
  }
}
