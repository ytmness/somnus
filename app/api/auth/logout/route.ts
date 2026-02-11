import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth/supabase-auth";

/**
 * POST /api/auth/logout
 * Cerrar sesión usando Supabase Auth
 */
export async function POST() {
  try {
    await signOut();
    
    const response = NextResponse.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });

    // Limpiar cookies de Supabase
    response.cookies.delete("sb-access-token");
    response.cookies.delete("sb-refresh-token");

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Error al cerrar sesión" },
      { status: 500 }
    );
  }
}


