import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { userOwnsEvent } from "@/lib/auth/event-access";
import type { AddOnKind } from "@prisma/client";

export const dynamic = "force-dynamic";

async function resolveId(
  params: Promise<{ id: string }> | { id: string }
): Promise<string> {
  const resolved =
    typeof (params as Promise<{ id: string }>)?.then === "function"
      ? await (params as Promise<{ id: string }>)
      : (params as { id: string });
  return resolved.id;
}

/**
 * GET /api/events/[id]/addons
 * Público: solo activos. Organizer/admin con ?all=1 ve todos.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const eventId = await resolveId(params);
    const wantAll = request.nextUrl.searchParams.get("all") === "1";

    let includeInactive = false;
    if (wantAll) {
      const user = await getSession();
      if (user && (await userOwnsEvent(user, eventId))) {
        includeInactive = true;
      }
    }

    const addOns = await prisma.eventAddOn.findMany({
      where: {
        eventId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: addOns.map((a) => ({
        ...a,
        price: Number(a.price),
        available:
          a.maxQuantity == null
            ? null
            : Math.max(0, a.maxQuantity - a.soldQuantity),
      })),
    });
  } catch (error) {
    console.error("[addons GET]", error);
    return NextResponse.json({ error: "Error al listar add-ons" }, { status: 500 });
  }
}

/**
 * POST /api/events/[id]/addons — crear
 * PATCH vía body.id
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const eventId = await resolveId(params);
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!(await userOwnsEvent(user, eventId))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();

    if (body?.id) {
      const updated = await prisma.eventAddOn.updateMany({
        where: { id: String(body.id), eventId },
        data: {
          ...(body.name != null ? { name: String(body.name).trim() } : {}),
          ...(body.description !== undefined
            ? {
                description: body.description
                  ? String(body.description).trim()
                  : null,
              }
            : {}),
          ...(body.kind != null ? { kind: body.kind as AddOnKind } : {}),
          ...(body.price != null ? { price: Number(body.price) } : {}),
          ...(body.maxQuantity !== undefined
            ? {
                maxQuantity:
                  body.maxQuantity == null ? null : Number(body.maxQuantity),
              }
            : {}),
          ...(body.isActive !== undefined
            ? { isActive: Boolean(body.isActive) }
            : {}),
        },
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: "Add-on no encontrado" }, { status: 404 });
      }
      const row = await prisma.eventAddOn.findUnique({
        where: { id: String(body.id) },
      });
      return NextResponse.json({ success: true, data: row });
    }

    const name = String(body?.name || "").trim();
    const price = Number(body?.price);
    if (!name || !Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: "name y price requeridos" },
        { status: 400 }
      );
    }

    const kind = (body?.kind || "OTHER") as AddOnKind;
    const created = await prisma.eventAddOn.create({
      data: {
        eventId,
        name,
        description: body?.description
          ? String(body.description).trim()
          : null,
        kind,
        price,
        maxQuantity:
          body?.maxQuantity != null ? Number(body.maxQuantity) : null,
        isActive: body?.isActive !== false,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("[addons POST]", error);
    return NextResponse.json({ error: "Error al guardar add-on" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  return POST(request, ctx);
}
