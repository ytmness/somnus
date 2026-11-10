import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { generateQRHash } from "@/lib/services/qr-generator";
import { emailsMatch, guestListErrorMessage } from "@/lib/guestlist";

export const dynamic = "force-dynamic";

async function resolveToken(
  params: Promise<{ token: string }> | { token: string }
): Promise<string> {
  const resolved =
    typeof (params as Promise<{ token: string }>)?.then === "function"
      ? await (params as Promise<{ token: string }>)
      : (params as { token: string });
  return resolved.token;
}

async function ticketsForSale(saleId: string) {
  const tickets = await prisma.ticket.findMany({
    where: { saleId },
    select: {
      id: true,
      ticketNumber: true,
      qrCode: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return tickets;
}

/**
 * GET /api/guestlist/[token]
 * Datos de una cortesía. Si hay sesión, indica si ya la canjeó el usuario.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const token = await resolveToken(params);
    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const entry = await prisma.guestListEntry.findUnique({
      where: { inviteToken: token },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            artist: true,
            eventDate: true,
            eventTime: true,
            venue: true,
            address: true,
            imageUrl: true,
          },
        },
        sale: {
          select: {
            id: true,
            buyerEmail: true,
            status: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: guestListErrorMessage(null, { notFound: true }) },
        { status: 404 }
      );
    }

    const user = await getSession();
    const isCancelled = entry.status === "CANCELLED";
    const claimed = !isCancelled && (entry.status === "USED" || !!entry.redeemedAt);
    const claimedByCurrentUser =
      !!user &&
      claimed &&
      !!entry.sale &&
      emailsMatch(entry.sale.buyerEmail, user.email);

    let tickets: Array<{
      id: string;
      ticketNumber: string;
      qrCode: string;
      status: string;
    }> = [];

    if (claimedByCurrentUser && entry.saleId) {
      tickets = await ticketsForSale(entry.saleId);
    }

    const canAccept =
      !!user &&
      !isCancelled &&
      (entry.status === "PENDING" || entry.status === "CONFIRMED") &&
      !entry.redeemedAt;

    let error: string | null = null;
    if (isCancelled) {
      error = guestListErrorMessage("CANCELLED");
    } else if (claimed && user && !claimedByCurrentUser) {
      error = guestListErrorMessage("USED", { claimedByOther: true });
    } else if (claimed && user && claimedByCurrentUser) {
      error = null;
    }

    // Cancelada: no hace falta login. Resto: sí, para aceptar o ver si ya es suya.
    const requiresAuth = !user && !isCancelled;

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        name: entry.name,
        quantity: entry.quantity,
        note: entry.note,
        status: entry.status,
        redeemedAt: entry.redeemedAt,
        event: entry.event,
        requiresAuth,
        canAccept,
        claimedByCurrentUser,
        tickets,
        error,
      },
    });
  } catch (error) {
    console.error("[guestlist token GET]", error);
    return NextResponse.json(
      { error: "Error al obtener guest list" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/guestlist/[token]
 * Aceptar cortesía: requiere sesión. Emite Sale COMPLETED $0 + Tickets (sin cargo Stripe/4%).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const token = await resolveToken(params);
    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: "Inicia sesión o regístrate para aceptar tu cortesía" },
        { status: 401 }
      );
    }

    const entry = await prisma.guestListEntry.findUnique({
      where: { inviteToken: token },
      include: {
        event: { select: { id: true, name: true } },
        sale: { select: { id: true, buyerEmail: true } },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: guestListErrorMessage(null, { notFound: true }) },
        { status: 404 }
      );
    }

    if (entry.status === "CANCELLED") {
      return NextResponse.json(
        { error: guestListErrorMessage("CANCELLED") },
        { status: 400 }
      );
    }

    // Ya canjeada: si es del usuario, devolver boletos; si no, error claro
    if (entry.status === "USED" || entry.redeemedAt) {
      if (entry.sale && emailsMatch(entry.sale.buyerEmail, user.email)) {
        const tickets = entry.saleId ? await ticketsForSale(entry.saleId) : [];
        return NextResponse.json({
          success: true,
          message: "Ya tienes tu boleto",
          data: {
            saleId: entry.saleId,
            entry: {
              id: entry.id,
              status: entry.status,
              redeemedAt: entry.redeemedAt,
            },
            tickets,
            alreadyClaimed: true,
          },
        });
      }
      return NextResponse.json(
        { error: guestListErrorMessage("USED", { claimedByOther: true }) },
        { status: 400 }
      );
    }

    const ticketType = await prisma.ticketType.findFirst({
      where: {
        eventId: entry.eventId,
        isActive: true,
        kind: "STANDARD",
        isTable: false,
      },
      orderBy: { price: "asc" },
    });

    if (!ticketType) {
      return NextResponse.json(
        {
          error:
            "No hay boleto disponible para esta cortesía. Contacta al organizador.",
        },
        { status: 400 }
      );
    }

    const qty = Math.max(1, entry.quantity);
    const eventPrefix = (entry.event.name || "EVT").substring(0, 3).toUpperCase();
    const typePrefix = (ticketType.name || "GL").substring(0, 3).toUpperCase();
    const buyerName = user.name?.trim() || entry.name;
    const buyerEmail = user.email.trim().toLowerCase();
    const buyerPhone = entry.phone || null;

    const result = await prisma.$transaction(async (tx) => {
      // Releer con lock lógico: evitar doble canje concurrente
      const fresh = await tx.guestListEntry.findUnique({
        where: { id: entry.id },
        select: { status: true, redeemedAt: true, saleId: true },
      });
      if (!fresh || fresh.status === "CANCELLED") {
        throw new Error("CANCELLED");
      }
      if (fresh.status === "USED" || fresh.redeemedAt) {
        throw new Error("ALREADY_USED");
      }

      const sale = await tx.sale.create({
        data: {
          eventId: entry.eventId,
          userId: user.id,
          channel: "ONLINE",
          status: "COMPLETED",
          subtotal: 0,
          tax: 0,
          total: 0,
          buyerName,
          buyerEmail,
          buyerPhone,
          paymentMethod: "guestlist",
          paidAt: new Date(),
          currency: "MXN",
          platformFeeAmount: 0,
          organizerNetAmount: 0,
        },
      });

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          ticketTypeId: ticketType.id,
          quantity: qty,
          isTable: false,
        },
      });

      const tickets = [];
      for (let i = 0; i < qty; i++) {
        const ticketCount = await tx.ticket.count({
          where: { ticketTypeId: ticketType.id },
        });
        const seq = String(ticketCount + 1).padStart(6, "0");
        const uniqueSuffix = crypto.randomBytes(3).toString("hex");
        const ticketNumber = `${eventPrefix}-${typePrefix}-${seq}-${uniqueSuffix}`;
        const tempQr = `tmp-${crypto.randomUUID()}`;

        const ticket = await tx.ticket.create({
          data: {
            saleId: sale.id,
            ticketTypeId: ticketType.id,
            ticketNumber,
            qrCode: tempQr,
          },
        });

        const qrHash = generateQRHash(ticket.id);
        const updated = await tx.ticket.update({
          where: { id: ticket.id },
          data: { qrCode: qrHash },
        });
        tickets.push(updated);
      }

      const updatedEntry = await tx.guestListEntry.update({
        where: { id: entry.id },
        data: {
          status: "USED",
          redeemedAt: new Date(),
          saleId: sale.id,
          email: buyerEmail,
          name: buyerName,
        },
      });

      return { sale, tickets, entry: updatedEntry };
    });

    return NextResponse.json({
      success: true,
      message: "¡Listo! Ya tienes tu boleto",
      data: {
        saleId: result.sale.id,
        entry: result.entry,
        tickets: result.tickets.map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          qrCode: t.qrCode,
          status: t.status,
        })),
        alreadyClaimed: false,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "CANCELLED") {
      return NextResponse.json(
        { error: guestListErrorMessage("CANCELLED") },
        { status: 400 }
      );
    }
    if (msg === "ALREADY_USED") {
      return NextResponse.json(
        { error: guestListErrorMessage("USED") },
        { status: 400 }
      );
    }
    console.error("[guestlist token POST]", error);
    return NextResponse.json(
      { error: "Error al aceptar cortesía" },
      { status: 500 }
    );
  }
}
