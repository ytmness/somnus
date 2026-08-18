import { NextResponse } from "next/server";
import { signOut } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 */
export async function POST() {
  try {
    await signOut({ redirect: false });
    return NextResponse.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });
  } catch (error) {
    // signOut puede lanzar redirect; cookies igual se limpian
    console.error("Logout error:", error);
    return NextResponse.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });
  }
}
