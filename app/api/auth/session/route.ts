import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/supabase-auth";

// Marcar como dinámica porque usa cookies
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/session
 * Obtener el usuario actual desde Supabase Auth
 */
export async function GET(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:8',message:'Session check called',data:{hasCookies:request.headers.get('cookie')?true:false,url:request.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  try {
    const user = await getSession();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:12',message:'Session check result',data:{hasUser:!!user,userId:user?.id,userRole:user?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get session error:", error);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:20',message:'Session check error',data:{errorMessage:error instanceof Error?error.message:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ user: null }, { status: 200 });
  }
}


