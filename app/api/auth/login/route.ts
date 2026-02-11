import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/auth/supabase-auth";
import { loginSchema } from "@/lib/validations/schemas";

/**
 * POST /api/auth/login
 * Enviar código OTP para iniciar sesión
 * Sin contraseña - solo email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Email inválido", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const supabase = createServerClient();

    // Enviar código OTP de 6 dígitos usando Supabase Auth
    // Supabase Auth automáticamente envía un código de 6 dígitos al email
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // En desarrollo, el código aparece en Supabase Dashboard > Authentication > Logs
        // En producción, el código se envía por email
      },
    });

    if (error) {
      console.error("[LOGIN] Error al enviar OTP:", error);
      return NextResponse.json(
        { error: error.message || "Error al enviar código de verificación" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Código de verificación enviado a tu email",
      // En desarrollo, el código aparece en Supabase Dashboard > Authentication > Logs
    });
  } catch (error: any) {
    console.error("[LOGIN] Error general:", error);
    return NextResponse.json(
      { error: "Error al enviar código de verificación" },
      { status: 500 }
    );
  }
}

