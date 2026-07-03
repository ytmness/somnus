import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/db/supabase";
import { loginSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

async function syncLegacyUserToSupabase(
  email: string,
  password: string,
  prismaPassword: string
): Promise<boolean> {
  const passwordValid = await bcrypt.compare(password, prismaPassword);
  if (!passwordValid) return false;

  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!createError) return true;

  const alreadyExists =
    createError.message?.toLowerCase().includes("already") ||
    createError.message?.toLowerCase().includes("registered");

  if (!alreadyExists) return false;

  const { data: userList } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existing = userList?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );
  if (!existing) return false;

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    existing.id,
    { password, email_confirm: true }
  );
  return !updateError;
}

/**
 * POST /api/auth/login
 * Inicio de sesión con email y contraseña via Supabase Auth
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
          error: "No encontramos una cuenta con ese correo. Crea una cuenta primero.",
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

    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailTrim,
      password,
    });

    if (authError && existingUser.password) {
      const synced = await syncLegacyUserToSupabase(
        emailTrim,
        password,
        existingUser.password
      );
      if (synced) {
        ({ data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailTrim,
          password,
        }));
      }
    }

    if (authError || !authData?.user) {
      console.error("[LOGIN] Error:", authError?.message);
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const jsonResponse = NextResponse.json({
      success: true,
      message: "Inicio de sesión exitoso",
      user: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
        emailVerified: existingUser.emailVerified,
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
    console.error("[LOGIN] Error general:", msg);
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 }
    );
  }
}
