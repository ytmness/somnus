import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/supabase-auth";
import { calculateClipCommission } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/invite
 * Crear una venta desde una invitación de mesa (pago por asiento)
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.CLIP_AUTH_TOKEN) {
      return NextResponse.json(
        { error: "El pago con tarjeta no está disponible. Contacta al administrador." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { inviteToken, buyerName, buyerEmail, buyerPhone } = body;

    if (!inviteToken || !buyerName || !buyerEmail) {
      return NextResponse.json(
        { error: "Se requiere inviteToken, buyerName y buyerEmail" },
        { status: 400 }
      );
    }

    const invite = await prisma.tableSlotInvite.findUnique({
      where: { inviteToken },
      include: { event: true, ticketType: true },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        {
          error:
            invite.status === "PAID"
              ? "Esta invitación ya fue pagada"
              : invite.status === "EXPIRED"
              ? "Esta invitación ha expirado"
              : "Esta invitación no está disponible",
        },
        { status: 400 }
      );
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      await prisma.tableSlotInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Esta invitación ha expirado" },
        { status: 400 }
      );
    }

    const subtotal = Number(invite.pricePerSeat);
    if (subtotal <= 0 || !Number.isFinite(subtotal)) {
      return NextResponse.json(
        { error: "Precio del asiento inválido" },
        { status: 400 }
      );
    }
    const { totalCommission } = calculateClipCommission(subtotal);
    const tax = Math.round(totalCommission * 100) / 100;
    const total = Math.round((subtotal + totalCommission) * 100) / 100;

    let userId: string | null = null;
    try {
      const user = await getSession();
      userId = user?.id || null;
    } catch {
      // Sin sesión: venta como invitado (userId null)
    }

    let saleId: string;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
          data: {
            eventId: invite.eventId,
            userId,
            channel: "ONLINE",
            status: "PENDING",
            subtotal,
            tax,
            total,
            buyerName: buyerName.trim(),
            buyerEmail: buyerEmail.trim(),
            buyerPhone: buyerPhone?.trim() || null,
            tableSlotInviteId: invite.id,
            paymentMethod: null,
          },
        });
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            ticketTypeId: invite.ticketTypeId,
            quantity: 1,
            isTable: true,
            tableNumber: `Mesa ${invite.tableNumber}`,
          },
        });
        return sale.id;
      });
      saleId = result;
    } catch (txError: any) {
      const code = txError?.code || "";
      const msg = txError?.message || String(txError);
      if (code === "P2002" || msg.includes("Unique constraint") || msg.includes("tableSlotInviteId")) {
        return NextResponse.json(
          { error: "Esta invitación ya tiene una orden. Revisa tu correo o intenta de nuevo." },
          { status: 400 }
        );
      }
      throw txError;
    }

    return NextResponse.json({
      success: true,
      message: "Redirigiendo a pago",
      data: { saleId },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Checkout invite] Error:", msg, error instanceof Error ? error.stack : "");
    const safeDetails =
      process.env.NODE_ENV === "development"
        ? msg
        : msg.slice(0, 200).replace(/\n/g, " ");
    return NextResponse.json(
      {
        error: "Error al procesar la orden",
        details: safeDetails,
      },
      { status: 500 }
    );
  }
}
