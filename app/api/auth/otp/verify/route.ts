import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { prisma } from "@/lib/db/prisma";
import { otpVerifySchema } from "@/lib/validations/schemas";

// Marcar como dinámica porque usa cookies
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/otp/verify
 * Verificar código OTP de 8 dígitos usando Supabase Auth
 */
export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/otp/verify/route.ts:10',message:'OTP verify endpoint called',data:{hasCookies:request.headers.get('cookie')?true:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Crear response primero para que el cliente SSR pueda establecer cookies
  const response = new NextResponse();
  
  try {
    const body = await request.json();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/otp/verify/route.ts:20',message:'Request body parsed',data:{email:body.email,hasToken:!!body.token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Validar datos
    const result = otpVerifySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const { email, token } = result.data;

    // Crear cliente Supabase SSR que maneja cookies correctamente
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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/otp/verify/route.ts:27',message:'Before verifyOtp',data:{email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Verificar código OTP
    // Si el usuario no existe en Supabase Auth, se crea automáticamente
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/otp/verify/route.ts:35',message:'After verifyOtp',data:{hasUser:!!authData.user,hasSession:!!authData.session,hasError:!!authError,errorMessage:authError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (authError || !authData.user) {
      console.error("[OTP VERIFY] Error:", authError);
      return NextResponse.json(
        { error: authError?.message || "Código OTP inválido o expirado" },
        { status: 400 }
      );
    }

    // Verificar si el usuario existe en nuestra tabla User
    let user = await prisma.user.findUnique({
      where: { email },
    }) as any;

    // Si el usuario no existe en nuestra tabla, significa que está registrándose
    // En este caso, necesitamos que primero se haya llamado a /api/auth/register
    // para guardar el nombre. Por ahora, creamos un usuario básico.
    // TODO: Mejorar este flujo para que el nombre se pase durante el registro
    if (!user) {
      // Crear usuario básico (el nombre debería venir del registro previo)
      // Por ahora usamos el email como nombre temporal
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0], // Nombre temporal basado en email
          role: "CLIENTE",
          isActive: true,
          password: "", // No se usa contraseña con OTP
          emailVerified: true, // Ya está verificado por Supabase Auth
        } as any,
      });
    } else {
      // Usuario existe, actualizar emailVerified
      if (!user.emailVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
          } as any,
        });
        user.emailVerified = true;
      }
    }

    // Las cookies de sesión se establecen automáticamente por el cliente SSR
    // cuando se usa verifyOtp. Verificar que la sesión se estableció correctamente
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/otp/verify/route.ts:95',message:'Before response - session check',data:{hasSession:!!session,hasSessionError:!!sessionError,userId:user.id,userRole:user.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Crear el JSON response usando NextResponse.json pero copiar las cookies del response anterior
    const jsonResponse = NextResponse.json({
      success: true,
      message: "Código OTP verificado exitosamente",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      session: session ? {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      } : null,
    });

    // Copiar todas las cookies del response original (que fueron establecidas por el cliente SSR)
    response.cookies.getAll().forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as any,
        path: cookie.path,
        maxAge: cookie.maxAge,
      });
    });

    // #region agent log
    const setCookieHeader = jsonResponse.headers.get('set-cookie');
    fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/otp/verify/route.ts:120',message:'Response created with cookies',data:{hasSetCookie:!!setCookieHeader,setCookieCount:setCookieHeader?setCookieHeader.split(',').length:0,responseStatus:200},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    return jsonResponse;
  } catch (error: any) {
    console.error("[OTP VERIFY] Error general:", error);
    return NextResponse.json(
      { error: "Error al verificar código OTP", details: error.message },
      { status: 500 }
    );
  }
}


