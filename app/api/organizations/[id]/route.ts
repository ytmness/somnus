import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { updateOrganizationSchema } from "@/lib/validations/schemas";
import { userOwnsOrganization } from "@/lib/auth/event-access";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/organizations/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN", "ORGANIZER"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const owns = await userOwnsOrganization(user!, params.id);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const result = updateOrganizationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const org = await prisma.organization.update({
      where: { id: params.id },
      data: result.data,
    });

    return NextResponse.json({ success: true, data: org });
  } catch (error) {
    console.error("PATCH organization error:", error);
    return NextResponse.json({ error: "Error al actualizar organización" }, { status: 500 });
  }
}

/**
 * DELETE /api/organizations/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN", "ORGANIZER"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const owns = await userOwnsOrganization(user!, params.id);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const eventCount = await prisma.event.count({
      where: { organizationId: params.id },
    });

    if (eventCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: tiene eventos asociados" },
        { status: 400 }
      );
    }

    await prisma.organization.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE organization error:", error);
    return NextResponse.json({ error: "Error al eliminar organización" }, { status: 500 });
  }
}
