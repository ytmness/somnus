import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/supabase-auth";
import { getActiveStaffRoles } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session
 * Obtener el usuario actual desde Supabase Auth
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const staffRoles =
      user.staffRoles ??
      getActiveStaffRoles(user.memberships ?? [], user.role);

    return NextResponse.json({
      user: {
        ...user,
        staffRoles,
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
