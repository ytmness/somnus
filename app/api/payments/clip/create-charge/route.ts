import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createClipCharge } from "@/lib/payments/clip";
import { generateQRHash } from "@/lib/services/qr-generator";

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

    if (!saleId || !token || !customer?.email) {
      return NextResponse.json(
        { error: "Faltan saleId, token o customer.email" },
        { status: 400 }
      );
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { event: true, saleItems: true },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    if (sale.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Esta venta ya fue pagada" },
        { status: 400 }
      );
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

    // Clip puede devolver paid: true o status: "captured"/"completed"
    const isPaid =
      clipRes?.paid === true ||
      clipRes?.status === "captured" ||
      clipRes?.status === "completed" ||
      clipRes?.status === "paid";
    if (!isPaid) {
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
    const eventPrefix = (sale.event?.name || "EVT").substring(0, 3).toUpperCase();
    for (const item of sale.saleItems) {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: item.ticketTypeId },
      });
      if (!ticketType) continue;

      const qty = item.isTable ? (ticketType.seatsPerTable || 4) : item.quantity;
      const typePrefix = (ticketType.name || "TKT").substring(0, 3).toUpperCase();

      for (let i = 0; i < qty; i++) {
        const ticketCount = await prisma.ticket.count({
          where: { ticketTypeId: item.ticketTypeId },
        });
        const ticketNumber = `${eventPrefix}-${typePrefix}-${String(ticketCount + 1).padStart(6, "0")}`;

        const ticket = await prisma.ticket.create({
          data: {
            saleId,
            ticketTypeId: item.ticketTypeId,
            ticketNumber,
            qrCode: "TEMP",
            tableNumber: item.tableNumber || null,
            seatNumber: item.isTable ? i + 1 : null,
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

    return NextResponse.json({
      success: true,
      data: { saleId, paid: true },
    });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error("Clip create-charge error:", errMsg, error?.stack);
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
