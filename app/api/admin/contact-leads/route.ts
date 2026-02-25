import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/contact-leads
 * Listar solicitudes del formulario de contacto (solo ADMIN)
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const leads = await prisma.contactLead.findMany({
      orderBy: { createdAt: "desc" },
    });

    const data = leads.map((l) => ({
      id: l.id,
      name: l.name,
      lastName: l.lastName,
      email: l.email,
      phone: l.phone,
      country: l.country,
      city: l.city,
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Admin contact-leads]", error);
    return NextResponse.json(
      { error: "Error al cargar solicitudes" },
      { status: 500 }
    );
  }
}
