import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/auth/supabase-auth";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/validations/schemas";

/**
 * POST /api/auth/register
 * Registrar un nuevo usuario y enviar código OTP
 * Sin contraseña - solo email y nombre
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[REGISTER] Request body recibido:", body);

    // Validar datos
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      console.error("[REGISTER] Error de validación:", result.error.errors);
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email, name, role } = result.data;
    const userRole = (role || "CLIENTE") as any;
    console.log("[REGISTER] Datos validados correctamente");

    // Verificar si el email ya existe en nuestra tabla User
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("[REGISTER] Email ya existe en tabla User:", email);
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400 }
      );
    }

    console.log("[REGISTER] Creando cliente Supabase...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[REGISTER] Variables de entorno faltantes");
      return NextResponse.json(
        { error: "Error de configuración del servidor: faltan variables de entorno de Supabase" },
        { status: 500 }
      );
    }

    const trimmedKey = supabaseAnonKey.trim();
    const trimmedUrl = supabaseUrl.trim();

    const supabase = createServerClient();
    console.log("[REGISTER] Cliente Supabase creado");

    // Crear usuario en nuestra tabla User (sin verificar todavía)
    // El usuario se verificará cuando complete el OTP
    console.log("[REGISTER] Creando usuario en tabla User...");
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: userRole,
        isActive: true,
        password: "", // No se usa contraseña con OTP
        emailVerified: false, // Se verifica cuando complete el OTP
      } as any,
    }) as any;

    console.log("[REGISTER] Usuario creado exitosamente:", user.id);

    // Enviar código OTP usando Supabase Auth
    // Supabase Auth automáticamente envía un código de 6 dígitos al email
    console.log("[REGISTER] Enviando código OTP...");
    const { data: otpData, error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // En desarrollo, el código aparece en Supabase Dashboard > Authentication > Logs
        // En producción, el código se envía por email
      },
    });

    if (otpError) {
      console.error("[REGISTER] Error al enviar OTP:", otpError);
      // Si falla el envío de OTP, eliminar el usuario creado
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      
      return NextResponse.json(
        { error: otpError.message || "Error al enviar código de verificación" },
        { status: 400 }
      );
    }

    console.log("[REGISTER] Código OTP enviado exitosamente");
    console.log("[REGISTER] ⚠️ En desarrollo, revisa Supabase Dashboard > Authentication > Logs para ver el código");

    return NextResponse.json({
      success: true,
      message: "Usuario registrado. Por favor verifica tu email con el código de 6 dígitos enviado.",
      requiresVerification: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error: any) {
    console.error("[REGISTER] Error general:", error);
    return NextResponse.json(
      {
        error: "Error al registrar usuario",
        details: error.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
