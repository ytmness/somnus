import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/db/supabase";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "VENDEDOR" | "SUPERVISOR" | "ACCESOS" | "CLIENTE";
  authUserId: string; // ID de Supabase Auth
}

/**
 * Crea un cliente de Supabase para uso en servidor (API routes)
 * Usa @supabase/ssr para manejar cookies correctamente en Next.js App Router
 */
export function createServerClient() {
  const cookieStore = cookies();
  
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Las cookies pueden fallar si se llaman desde un middleware
            // En ese caso, las cookies se establecerán en el response
          }
        },
      },
    }
  );
}

/**
 * Obtiene el cliente Admin de Supabase (para operaciones privilegiadas)
 */
export function getSupabaseAdmin() {
  return supabaseAdmin;
}

/**
 * Obtiene el usuario actual desde Supabase Auth y la tabla User
 * NOTA: Esta función debe ser llamada desde un contexto donde las cookies estén disponibles
 * (API routes o Server Components)
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const supabase = createServerClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/supabase-auth.ts:42',message:'getSession - Supabase session check',data:{hasSession:!!session,hasError:!!error,hasUser:!!session?.user,userEmail:session?.user?.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (error || !session?.user) {
      return null;
    }

    // Buscar usuario en nuestra tabla User por email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as SessionUser["role"],
      authUserId: session.user.id,
    };
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Obtiene el usuario de Supabase Auth sin verificar en tabla User
 */
export async function getAuthUser() {
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Cierra la sesión
 */
export async function signOut() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos
 */
export function hasRole(
  user: SessionUser | null,
  allowedRoles: SessionUser["role"][]
): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

