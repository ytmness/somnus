import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/auth/supabase-auth";
import { z } from "zod";

const sendOtpSchema = z.object({
  email: z.string().email("Email inválido"),
});

/**
 * POST /api/auth/otp/send
 * Enviar código OTP de 6 dígitos usando Supabase Auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos
    const result = sendOtpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Email inválido", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const supabase = createServerClient();

    // Enviar código OTP de 6 dígitos
    // Supabase Auth automáticamente envía un código de 6 dígitos al email
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // En desarrollo, Supabase muestra el código en los logs del dashboard
        // En producción, el código se envía por email
      },
    });

    if (error) {
      console.error("[OTP SEND] Error:", error);
      return NextResponse.json(
        { error: error.message || "Error al enviar código OTP" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Código OTP enviado a tu email",
      // En desarrollo, el código aparece en Supabase Dashboard > Authentication > Logs
    });
  } catch (error: any) {
    console.error("[OTP SEND] Error general:", error);
    return NextResponse.json(
      { error: "Error al enviar código OTP", details: error.message },
      { status: 500 }
    );
  }
}

