import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { userOwnsOrganization } from "@/lib/auth/event-access";

export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

/**
 * GET /api/organizations/[id]/membership-plans — público (planes activos)
 * POST — organizador crea plan
 */
export async function GET(_request: NextRequest, { params }: RouteCtx) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: params.id },
      select: { id: true, isActive: true },
    });
    if (!org || !org.isActive) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 404 }
      );
    }

    const plans = await prisma.membershipPlan.findMany({
      where: { organizationId: org.id, isActive: true },
      orderBy: { priceCents: "asc" },
    });

    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    console.error("[membership-plans GET]", error);
    return NextResponse.json(
      { error: "Error al listar planes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!(await userOwnsOrganization(user, params.id))) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() || null : null;
    const priceCents = Number(body.priceCents);
    const currency =
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : "MXN";
    const interval =
      body.interval === "year" || body.interval === "month"
        ? body.interval
        : "month";
    const perks =
      typeof body.perks === "string"
        ? body.perks
        : body.perks != null
          ? JSON.stringify(body.perks)
          : null;
    const earlyAccessHours =
      body.earlyAccessHours != null && body.earlyAccessHours !== ""
        ? Number(body.earlyAccessHours)
        : null;

    if (!name) {
      return NextResponse.json({ error: "name es requerido" }, { status: 400 });
    }
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      return NextResponse.json(
        { error: "priceCents inválido" },
        { status: 400 }
      );
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        organizationId: params.id,
        name,
        description,
        priceCents: Math.round(priceCents),
        currency,
        interval,
        perks,
        earlyAccessHours:
          earlyAccessHours != null && Number.isFinite(earlyAccessHours)
            ? Math.round(earlyAccessHours)
            : null,
      },
    });

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error("[membership-plans POST]", error);
    return NextResponse.json(
      { error: "Error al crear plan" },
      { status: 500 }
    );
  }
}
