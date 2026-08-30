import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { userOwnsEvent } from "@/lib/auth/event-access";
import type { DiscountType } from "@prisma/client";

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

async function requireOrganizer(eventId: string) {
  const user = await getSession();
  if (!user) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  const owns = await userOwnsEvent(user, eventId);
  if (!owns) return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  return { user };
}

/**
 * GET /api/events/[id]/discounts
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const eventId = await resolveId(params);
    const auth = await requireOrganizer(eventId);
    if (auth.error) return auth.error;

    const codes = await prisma.discountCode.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: codes });
  } catch (error) {
    console.error("[discounts GET]", error);
    return NextResponse.json({ error: "Error al listar códigos" }, { status: 500 });
  }
}

/**
 * POST /api/events/[id]/discounts
 * Create or update (if body.id) / delete (if body._delete)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const eventId = await resolveId(params);
    const auth = await requireOrganizer(eventId);
    if (auth.error) return auth.error;

    const body = await request.json();

    if (body?._delete && body?.id) {
      await prisma.discountCode.deleteMany({
        where: { id: String(body.id), eventId },
      });
      return NextResponse.json({ success: true });
    }

    if (body?.id) {
      const updated = await prisma.discountCode.updateMany({
        where: { id: String(body.id), eventId },
        data: {
          ...(body.code != null
            ? { code: String(body.code).trim().toUpperCase() }
            : {}),
          ...(body.discountType != null
            ? { discountType: body.discountType as DiscountType }
            : {}),
          ...(body.value != null ? { value: Number(body.value) } : {}),
          ...(body.maxUses !== undefined
            ? { maxUses: body.maxUses == null ? null : Number(body.maxUses) }
            : {}),
          ...(body.minSubtotal !== undefined
            ? {
                minSubtotal:
                  body.minSubtotal == null ? null : Number(body.minSubtotal),
              }
            : {}),
          ...(body.startsAt !== undefined
            ? {
                startsAt: body.startsAt ? new Date(body.startsAt) : null,
              }
            : {}),
          ...(body.endsAt !== undefined
            ? { endsAt: body.endsAt ? new Date(body.endsAt) : null }
            : {}),
          ...(body.isActive !== undefined
            ? { isActive: Boolean(body.isActive) }
            : {}),
        },
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: "Código no encontrado" }, { status: 404 });
      }
      const row = await prisma.discountCode.findUnique({
        where: { id: String(body.id) },
      });
      return NextResponse.json({ success: true, data: row });
    }

    const code = String(body?.code || "").trim().toUpperCase();
    const discountType = (body?.discountType || "PERCENTAGE") as DiscountType;
    const value = Number(body?.value);

    if (!code || !Number.isFinite(value) || value <= 0) {
      return NextResponse.json(
        { error: "code y value positivos requeridos" },
        { status: 400 }
      );
    }
    if (discountType !== "PERCENTAGE" && discountType !== "FIXED") {
      return NextResponse.json({ error: "discountType inválido" }, { status: 400 });
    }
    if (discountType === "PERCENTAGE" && value > 100) {
      return NextResponse.json(
        { error: "Porcentaje máximo 100" },
        { status: 400 }
      );
    }

    const created = await prisma.discountCode.create({
      data: {
        eventId,
        code,
        discountType,
        value,
        maxUses: body?.maxUses != null ? Number(body.maxUses) : null,
        minSubtotal: body?.minSubtotal != null ? Number(body.minSubtotal) : null,
        startsAt: body?.startsAt ? new Date(body.startsAt) : null,
        endsAt: body?.endsAt ? new Date(body.endsAt) : null,
        isActive: body?.isActive !== false,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Unique constraint") || msg.includes("unique")) {
      return NextResponse.json(
        { error: "Ya existe ese código en el evento" },
        { status: 409 }
      );
    }
    console.error("[discounts POST]", error);
    return NextResponse.json({ error: "Error al guardar código" }, { status: 500 });
  }
}

/**
 * PATCH /api/events/[id]/discounts
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  const body = await request.json();
  const fake = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(body),
  });
  return POST(fake as NextRequest, ctx);
}

/**
 * DELETE /api/events/[id]/discounts?id=
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const eventId = await resolveId(params);
    const auth = await requireOrganizer(eventId);
    if (auth.error) return auth.error;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    await prisma.discountCode.deleteMany({ where: { id, eventId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[discounts DELETE]", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
