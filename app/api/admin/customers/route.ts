import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const q = (request.nextUrl.searchParams.get("q") || "").trim();

    const [users, sales] = await Promise.all([
      prisma.user.findMany({
        where: q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.sale.findMany({
        where: q
          ? {
              OR: [
                { buyerName: { contains: q, mode: "insensitive" } },
                { buyerEmail: { contains: q, mode: "insensitive" } },
                { buyerPhone: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        select: {
          id: true,
          status: true,
          total: true,
          buyerName: true,
          buyerEmail: true,
          buyerPhone: true,
          paymentMethod: true,
          paidAt: true,
          createdAt: true,
          event: { select: { id: true, name: true } },
          tickets: {
            select: {
              id: true,
              ticketNumber: true,
              status: true,
              tableNumber: true,
              seatNumber: true,
              scannedAt: true,
              ticketType: { select: { name: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ]);

    const byEmail = new Map();

    for (const u of users) {
      const key = u.email.toLowerCase();
      byEmail.set(key, {
        email: u.email,
        name: u.name,
        phone: u.phone,
        user: u,
        sales: [],
      });
    }

    for (const s of sales) {
      const key = (s.buyerEmail || "").toLowerCase() || "sale:" + s.id;
      const row = byEmail.get(key);
      if (row) {
        row.sales.push(s);
        if (!row.name && s.buyerName) row.name = s.buyerName;
        if (!row.phone && s.buyerPhone) row.phone = s.buyerPhone;
      } else {
        byEmail.set(key, {
          email: s.buyerEmail,
          name: s.buyerName,
          phone: s.buyerPhone ?? null,
          user: null,
          sales: [s],
        });
      }
    }

    const customers = Array.from(byEmail.values()).map((c) => ({
      email: c.email,
      name: c.name,
      phone: c.phone,
      account: c.user
        ? {
            id: c.user.id,
            role: c.user.role,
            isActive: c.user.isActive,
            emailVerified: c.user.emailVerified,
            createdAt: c.user.createdAt,
          }
        : null,
      saleCount: c.sales.length,
      ticketCount: c.sales.reduce((n, s) => n + s.tickets.length, 0),
      sales: c.sales.map((s) => ({
        id: s.id,
        status: s.status,
        total: Number(s.total),
        eventName: s.event.name,
        paymentMethod: s.paymentMethod,
        paidAt: s.paidAt,
        createdAt: s.createdAt,
        tickets: s.tickets.map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          status: t.status,
          typeName: t.ticketType.name,
          tableNumber: t.tableNumber,
          seatNumber: t.seatNumber,
          scannedAt: t.scannedAt,
        })),
      })),
    }));

    customers.sort((a, b) => b.ticketCount - a.ticketCount || b.saleCount - a.saleCount);

    return NextResponse.json({
      success: true,
      data: customers,
      totals: {
        customers: customers.length,
        users: users.length,
        sales: sales.length,
        tickets: sales.reduce((n, s) => n + s.tickets.length, 0),
      },
    });
  } catch (error) {
    console.error("GET admin/customers error:", error);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}
