import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/supabase-auth";
import { prisma } from "@/lib/db/prisma";
import type { CommissionScope, CommissionType } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/commissions
 * Lista todas las reglas de comisión.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const rules = await prisma.commissionRule.findMany({
      include: {
        organizer: { select: { id: true, businessName: true } },
        event: { select: { id: true, name: true } },
      },
      orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
    });

    const organizers = await prisma.organizer.findMany({
      select: { id: true, businessName: true },
      orderBy: { businessName: "asc" },
    });

    const events = await prisma.event.findMany({
      select: { id: true, name: true },
      orderBy: { eventDate: "desc" },
      take: 50,
    });

    return NextResponse.json({ rules, organizers, events });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/commissions
 * Crea una regla de comisión.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await request.json();
    const {
      scope,
      organizerId,
      eventId,
      commissionType,
      commissionPercentage,
      commissionFixedAmount,
      currency,
      isActive,
    } = body as {
      scope: CommissionScope;
      organizerId?: string;
      eventId?: string;
      commissionType: CommissionType;
      commissionPercentage?: number;
      commissionFixedAmount?: number;
      currency?: string;
      isActive?: boolean;
    };

    if (!scope || !commissionType) {
      return NextResponse.json(
        { error: "scope y commissionType son requeridos" },
        { status: 400 }
      );
    }

    if (scope === "ORGANIZER" && !organizerId) {
      return NextResponse.json(
        { error: "organizerId requerido para scope ORGANIZER" },
        { status: 400 }
      );
    }

    if (scope === "EVENT" && !eventId) {
      return NextResponse.json(
        { error: "eventId requerido para scope EVENT" },
        { status: 400 }
      );
    }

    if (scope === "EVENT" && eventId) {
      await prisma.commissionRule.deleteMany({ where: { eventId } });
    }

    const rule = await prisma.commissionRule.create({
      data: {
        scope,
        organizerId: scope === "ORGANIZER" ? organizerId : null,
        eventId: scope === "EVENT" ? eventId : null,
        commissionType,
        commissionPercentage: commissionPercentage ?? null,
        commissionFixedAmount: commissionFixedAmount ?? null,
        currency: currency || "MXN",
        isActive: isActive ?? true,
      },
      include: {
        organizer: { select: { id: true, businessName: true } },
        event: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ rule });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/commissions
 * Actualiza una regla de comisión existente.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body as {
      id: string;
      commissionType?: CommissionType;
      commissionPercentage?: number;
      commissionFixedAmount?: number;
      isActive?: boolean;
    };

    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    const rule = await prisma.commissionRule.update({
      where: { id },
      data: {
        ...(updates.commissionType ? { commissionType: updates.commissionType } : {}),
        ...(updates.commissionPercentage !== undefined
          ? { commissionPercentage: updates.commissionPercentage }
          : {}),
        ...(updates.commissionFixedAmount !== undefined
          ? { commissionFixedAmount: updates.commissionFixedAmount }
          : {}),
        ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
      },
      include: {
        organizer: { select: { id: true, businessName: true } },
        event: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ rule });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
