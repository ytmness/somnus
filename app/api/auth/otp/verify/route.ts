import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { prisma } from "@/lib/db/prisma";
import { otpVerifySchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/otp/verify
 * Verificar código OTP (8 dígitos) via Supabase Auth
 */
export async function POST(request: NextRequest) {
  const response = new NextResponse();

  try {
    const body = await request.json();
    const result = otpVerifySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid data", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email, token } = result.data;

    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (authError || !authData.user) {
      console.error("[OTP VERIFY] Error:", authError);
      return NextResponse.json(
        { error: authError?.message || "Invalid or expired OTP code" },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { email },
    }) as any;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0],
          role: "CLIENTE",
          isActive: true,
          password: "",
          emailVerified: true,
        } as any,
      });
    } else if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true } as any,
      });
      user.emailVerified = true;
    }

    const { data: { session } } = await supabase.auth.getSession();

    const jsonResponse = NextResponse.json({
      success: true,
      message: "OTP code verified successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      session: session
        ? { access_token: session.access_token, refresh_token: session.refresh_token }
        : null,
    });

    response.cookies.getAll().forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as any,
        path: cookie.path,
        maxAge: cookie.maxAge,
      });
    });

    return jsonResponse;
  } catch (error: any) {
    console.error("[OTP VERIFY] Error general:", error);
    return NextResponse.json(
      { error: "Error verifying OTP code", details: error.message },
      { status: 500 }
    );
  }
}
