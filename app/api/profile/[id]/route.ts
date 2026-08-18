import { NextRequest, NextResponse } from "next/server";
import { buildProfileForUserId } from "@/lib/profile";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/[id] — perfil público
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await buildProfileForUserId(params.id);
    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("[profile/:id GET]", error);
    return NextResponse.json({ error: "Error al cargar perfil" }, { status: 500 });
  }
}
