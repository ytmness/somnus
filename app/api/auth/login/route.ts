import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validations/schemas";
import { resolveAuthRedirectForUser } from "@/lib/auth/redirect-path";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 * Email/contraseña vía Auth.js Credentials
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const emailTrim = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: emailTrim },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          error:
            "No encontramos una cuenta con ese correo. Crea una cuenta primero.",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (!existingUser.isActive) {
      return NextResponse.json(
        { error: "Tu cuenta está desactivada. Contacta soporte." },
        { status: 403 }
      );
    }

    try {
      await signIn("credentials", {
        email: emailTrim,
        password,
        redirect: false,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: "Correo o contraseña incorrectos" },
          { status: 401 }
        );
      }
      // Next.js puede lanzar NEXT_REDIRECT; con redirect:false no debería
      throw err;
    }

    const redirectPath = await resolveAuthRedirectForUser(
      existingUser.id,
      existingUser.role
    );

    return NextResponse.json({
      success: true,
      message: "Inicio de sesión exitoso",
      redirectPath,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
        emailVerified: existingUser.emailVerified,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    // Auth.js a veces usa redirect interno; si la cookie ya se setó, ok
    if (msg.includes("NEXT_REDIRECT") || msg.includes("CALLBACK_REDIRECT")) {
      return NextResponse.json({
        success: true,
        message: "Inicio de sesión exitoso",
      });
    }
    console.error("[LOGIN] Error general:", msg);
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 }
    );
  }
}
