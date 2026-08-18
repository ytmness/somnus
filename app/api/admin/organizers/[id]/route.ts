import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * GET /api/admin/organizers/[id]
 * Detalle de un organizador con eventos, organizaciones y comisiones
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const organizer = await prisma.organizer.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            isActive: true,
            role: true,
          },
        },
        organizations: {
          select: {
            id: true,
            name: true,
            isActive: true,
            _count: { select: { events: true } },
          },
          orderBy: { name: "asc" },
        },
        events: {
          select: {
            id: true,
            name: true,
            venue: true,
            eventDate: true,
            isActive: true,
          },
          orderBy: { eventDate: "desc" },
        },
        commissionRules: {
          where: { scope: "ORGANIZER" },
          select: {
            id: true,
            scope: true,
            commissionType: true,
            commissionPercentage: true,
            commissionFixedAmount: true,
            isActive: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!organizer) {
      return NextResponse.json({ error: "Organizador no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: organizer.id,
        businessName: organizer.businessName,
        contactEmail: organizer.contactEmail,
        isActive: organizer.isActive,
        stripeAccountId: organizer.stripeAccountId,
        stripeOnboardingStatus: organizer.stripeOnboardingStatus,
        chargesEnabled: organizer.chargesEnabled,
        payoutsEnabled: organizer.payoutsEnabled,
        createdAt: organizer.createdAt,
        user: organizer.user,
        organizations: organizer.organizations,
        events: organizer.events,
        commissionRules: organizer.commissionRules.map((r) => ({
          ...r,
          commissionPercentage: r.commissionPercentage?.toString() ?? null,
          commissionFixedAmount: r.commissionFixedAmount?.toString() ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("GET admin/organizers/[id] error:", error);
    return NextResponse.json({ error: "Error al obtener organizador" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/organizers/[id]
 * Actualiza perfil del organizador y usuario vinculado
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const organizer = await prisma.organizer.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    });

    if (!organizer) {
      return NextResponse.json({ error: "Organizador no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const {
      businessName,
      contactEmail,
      isActive,
      userName,
      userPhone,
      userIsActive,
    } = body as {
      businessName?: string;
      contactEmail?: string;
      isActive?: boolean;
      userName?: string;
      userPhone?: string | null;
      userIsActive?: boolean;
    };

    if (businessName !== undefined && !businessName.trim()) {
      return NextResponse.json({ error: "El nombre del negocio es requerido" }, { status: 400 });
    }

    if (contactEmail !== undefined && !isValidEmail(contactEmail)) {
      return NextResponse.json({ error: "Email de contacto inválido" }, { status: 400 });
    }

    const organizerData: {
      businessName?: string;
      contactEmail?: string;
      isActive?: boolean;
    } = {};

    if (businessName !== undefined) organizerData.businessName = businessName.trim();
    if (contactEmail !== undefined) organizerData.contactEmail = contactEmail.trim();
    if (isActive !== undefined) organizerData.isActive = isActive;

    const userData: {
      name?: string;
      phone?: string | null;
      isActive?: boolean;
    } = {};

    if (userName !== undefined) userData.name = userName.trim();
    if (userPhone !== undefined) userData.phone = userPhone?.trim() || null;
    if (userIsActive !== undefined) userData.isActive = userIsActive;

    const updated = await prisma.$transaction(async (tx) => {
      if (Object.keys(organizerData).length > 0) {
        await tx.organizer.update({
          where: { id: params.id },
          data: organizerData,
        });
      }

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: organizer.userId },
          data: userData,
        });
      }

      return tx.organizer.findUnique({
        where: { id: params.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              isActive: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH admin/organizers/[id] error:", error);
    return NextResponse.json({ error: "Error al actualizar organizador" }, { status: 500 });
  }
}
