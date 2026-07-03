import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import bcrypt from "bcryptjs";
import { resolvePublicRegistrationRole } from "@/lib/auth/registration";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/db/supabase";
import { registerSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * POST /api/auth/register
 * Registrar usuario en Prisma + Supabase Auth (email/contraseña)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email, name, phone, password } = result.data;
    const emailTrim = email.trim().toLowerCase();
    const userRole = resolvePublicRegistrationRole();
    const phoneClean = phone?.trim() || null;
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await prisma.user.findUnique({
      where: { email: emailTrim },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "Este correo ya está registrado. Inicia sesión.",
          code: "EMAIL_EXISTS",
        },
        { status: 400 }
      );
    }

    const user = (await prisma.user.create({
      data: {
        email: emailTrim,
        name: name.trim(),
        phone: phoneClean,
        role: userRole,
        isActive: true,
        password: hashedPassword,
        emailVerified: true,
      } as any,
    })) as any;

    const { error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email: emailTrim,
      password,
      email_confirm: true,
      user_metadata: { name: name.trim() },
    });

    if (supabaseError) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      const alreadyExists =
        supabaseError.message?.toLowerCase().includes("already") ||
        supabaseError.message?.toLowerCase().includes("registered");
      return NextResponse.json(
        {
          error: alreadyExists
            ? "Este correo ya está registrado. Inicia sesión."
            : supabaseError.message || "Error al crear la cuenta",
          code: alreadyExists ? "EMAIL_EXISTS" : undefined,
        },
        { status: 400 }
      );
    }

    const pendingCookies: CookieToSet[] = [];
    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            pendingCookies.push(...cookiesToSet);
          },
        },
      }
    );

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailTrim,
      password,
    });

    if (signInError) {
      console.error("[REGISTER] Auto-login error:", signInError.message);
    }

    const jsonResponse = NextResponse.json({
      success: true,
      message: "Cuenta creada correctamente",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });

    pendingCookies.forEach(({ name, value, options }) => {
      jsonResponse.cookies.set(
        name,
        value,
        options as Parameters<typeof jsonResponse.cookies.set>[2]
      );
    });

    return jsonResponse;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[REGISTER] Error general:", msg);
    return NextResponse.json(
      { error: "Error al registrar usuario", details: msg },
      { status: 500 }
    );
  }
}
