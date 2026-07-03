import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { organizationSchema } from "@/lib/validations/schemas";
import { ensureOrganizerProfile } from "@/lib/auth/event-access";
import { generateUniqueOrgSlug } from "@/lib/utils/org-slug";

export const dynamic = "force-dynamic";

/**
 * GET /api/organizations
 * Lista organizaciones del usuario actual (o todas si ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizerId = searchParams.get("organizerId");

    if (user.role === "ADMIN") {
      const orgs = await prisma.organization.findMany({
        where: organizerId ? { organizerId } : undefined,
        include: {
          organizer: { select: { id: true, businessName: true, contactEmail: true } },
          _count: { select: { events: true } },
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ success: true, data: orgs });
    }

    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id },
    });

    if (!organizer) {
      return NextResponse.json({ success: true, data: [] });
    }

    const orgs = await prisma.organization.findMany({
      where: { organizerId: organizer.id },
      include: { _count: { select: { events: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: orgs });
  } catch (error) {
    console.error("GET organizations error:", error);
    return NextResponse.json({ error: "Error al obtener organizaciones" }, { status: 500 });
  }
}

/**
 * POST /api/organizations
 * Crear organización (ORGANIZER o ADMIN)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN", "ORGANIZER"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const result = organizationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const organizer = await ensureOrganizerProfile(user!);
    const slug = await generateUniqueOrgSlug(result.data.name);

    const org = await prisma.organization.create({
      data: {
        organizerId: organizer.id,
        name: result.data.name,
        slug,
        description: result.data.description,
        logoUrl: result.data.logoUrl || null,
      },
    });

    return NextResponse.json({ success: true, data: org }, { status: 201 });
  } catch (error) {
    console.error("POST organizations error:", error);
    return NextResponse.json({ error: "Error al crear organización" }, { status: 500 });
  }
}
