import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { getAccessibleEventIds } from "@/lib/auth/permissions";
import { lookupBuyerProfilesByEmails } from "@/lib/profile";

export const dynamic = "force-dynamic";

/**
 * GET /api/sales/pending-approvals
 * Lista ventas PENDING + perfil del comprador (para revisar antes de cobrar).
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    let eventFilter: { eventId?: { in: string[] } } = {};
    if (user.role !== "ADMIN") {
      const accessible = await getAccessibleEventIds(user);
      if (accessible !== "all" && accessible.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
      if (accessible !== "all") {
        eventFilter = { eventId: { in: accessible } };
      }
    }

    const sales = await prisma.sale.findMany({
      where: {
        approvalStatus: "PENDING",
        status: "PENDING",
        providerStatus: "requires_capture",
        ...eventFilter,
      },
      include: {
        event: {
          select: { id: true, name: true, artist: true, eventDate: true },
        },
        saleItems: true,
      },
      orderBy: { createdAt: "desc" },
      take: user.role === "ADMIN" ? 200 : 100,
    });

    const ticketTypeIds = Array.from(
      new Set(
        sales
          .flatMap((s) => s.saleItems.map((i) => i.ticketTypeId))
          .filter((id): id is string => Boolean(id))
      )
    );
    const ticketTypes = await prisma.ticketType.findMany({
      where: { id: { in: ticketTypeIds } },
      select: { id: true, name: true },
    });
    const ttMap = Object.fromEntries(ticketTypes.map((t) => [t.id, t.name]));

    const profiles = await lookupBuyerProfilesByEmails(
      sales.map((s) => s.buyerEmail)
    );

    return NextResponse.json({
      success: true,
      data: sales.map((s) => {
        const emailKey = s.buyerEmail.trim().toLowerCase();
        const buyerProfile = profiles[emailKey] ?? null;
        return {
          id: s.id,
          buyerName: s.buyerName,
          buyerEmail: s.buyerEmail,
          buyerPhone: s.buyerPhone,
          subtotal: Number(s.subtotal),
          tax: Number(s.tax),
          total: Number(s.total),
          createdAt: s.createdAt,
          providerStatus: s.providerStatus,
          event: s.event,
          buyerProfile,
          saleItems: s.saleItems.map((i) => ({
            id: i.id,
            ticketTypeId: i.ticketTypeId,
            ticketTypeName: i.ticketTypeId
              ? ttMap[i.ticketTypeId] || "—"
              : i.addOnId
                ? "Add-on"
                : "—",
            quantity: i.quantity,
            guestCount: i.guestCount,
            addOnId: i.addOnId,
          })),
        };
      }),
    });
  } catch (error) {
    console.error("[pending-approvals] Error:", error);
    return NextResponse.json(
      { error: "Error al listar aprobaciones pendientes" },
      { status: 500 }
    );
  }
}
