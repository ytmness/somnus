import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/user/client-tour
 * Marks the client home tour as seen for the current account.
 */
export async function PATCH() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { clientTourSeen: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("client-tour PATCH error:", error);
    return NextResponse.json(
      { error: "Could not update tour status" },
      { status: 500 }
    );
  }
}
