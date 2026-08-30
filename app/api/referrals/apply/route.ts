import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { applyReferralCodeForUser } from "@/lib/referrals/apply";

export const dynamic = "force-dynamic";

/**
 * POST /api/referrals/apply { code }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const code = typeof body.code === "string" ? body.code : "";
    const result = await applyReferralCodeForUser(user.id, code);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[referrals apply]", error);
    return NextResponse.json(
      { error: "Error al aplicar código" },
      { status: 500 }
    );
  }
}
