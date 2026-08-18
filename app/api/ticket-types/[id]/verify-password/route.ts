import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  signTicketPasswordToken,
  verifyTicketPassword,
} from "@/lib/ticket-access";

export const dynamic = "force-dynamic";

/**
 * POST /api/ticket-types/[id]/verify-password
 * Body: { password: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const password = String(body.password || "");
    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const tt = await prisma.ticketType.findUnique({
      where: { id: params.id },
      select: { id: true, passwordHash: true },
    });
    if (!tt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!tt.passwordHash) {
      return NextResponse.json({
        success: true,
        token: signTicketPasswordToken(tt.id),
      });
    }

    const ok = await verifyTicketPassword(password, tt.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      token: signTicketPasswordToken(tt.id),
    });
  } catch (e) {
    console.error("verify-password error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
