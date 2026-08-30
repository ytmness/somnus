import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { userOwnsEvent } from "@/lib/auth/event-access";

export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

function slugifyCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
}

/**
 * GET /api/events/[id]/promoters
 * POST — crear PromoterLink { userId | email, code, label, commissionPct }
 */
export async function GET(_request: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!(await userOwnsEvent(user, params.id))) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const links = await prisma.promoterLink.findMany({
      where: { eventId: params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    console.error("[promoters GET]", error);
    return NextResponse.json(
      { error: "Error al listar promoters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!(await userOwnsEvent(session, params.id))) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const label =
      typeof body.label === "string" ? body.label.trim() || null : null;
    const commissionPct =
      body.commissionPct != null && body.commissionPct !== ""
        ? Number(body.commissionPct)
        : null;

    let code =
      typeof body.code === "string" && body.code.trim()
        ? slugifyCode(body.code)
        : "";

    let promoterUserId =
      typeof body.userId === "string" ? body.userId.trim() : "";

    if (!promoterUserId && typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!email) {
        return NextResponse.json(
          { error: "userId o email requerido" },
          { status: 400 }
        );
      }
      const u = await prisma.user.findUnique({ where: { email } });
      if (!u) {
        // Invite stub: create inactive placeholder? Prefer fail with clear message.
        return NextResponse.json(
          {
            error:
              "No hay usuario con ese email. Pídele que se registre primero o pasa userId.",
            code: "USER_NOT_FOUND",
          },
          { status: 400 }
        );
      }
      promoterUserId = u.id;
    }

    if (!promoterUserId) {
      return NextResponse.json(
        { error: "userId o email requerido" },
        { status: 400 }
      );
    }

    const promoter = await prisma.user.findUnique({
      where: { id: promoterUserId },
      select: { id: true },
    });
    if (!promoter) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (!code) {
      code = `P${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    }

    const existing = await prisma.promoterLink.findUnique({
      where: { eventId_code: { eventId: event.id, code } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un promoter con ese código en este evento" },
        { status: 409 }
      );
    }

    const link = await prisma.promoterLink.create({
      data: {
        eventId: event.id,
        userId: promoterUserId,
        code,
        label,
        commissionPct:
          commissionPct != null && Number.isFinite(commissionPct)
            ? commissionPct
            : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: link });
  } catch (error) {
    console.error("[promoters POST]", error);
    return NextResponse.json(
      { error: "Error al crear promoter" },
      { status: 500 }
    );
  }
}
