import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/payments/config";
import { isWalletPassEnabled } from "@/lib/services/wallet-pass";
import {
  getWalletPassTokenTtlSeconds,
  signWalletPassToken,
} from "@/lib/services/wallet-pass-token";
import { userOwnsTicket } from "@/lib/services/ticket-ownership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tickets/[ticketId]/pkpass-link
 *
 * Devuelve una URL firmada (10 min) para descargar el pase de Apple Wallet.
 * Necesaria porque en la app nativa el .pkpass se abre en Safari, que no
 * comparte la cookie de sesión del WebView.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!isWalletPassEnabled()) {
      return NextResponse.json(
        { error: "Apple Wallet no está disponible en este momento" },
        { status: 503 }
      );
    }

    if (!(await userOwnsTicket(user, params.ticketId))) {
      return NextResponse.json(
        { error: "Boleto no encontrado" },
        { status: 404 }
      );
    }

    const token = await signWalletPassToken(params.ticketId, user.id);
    const url = `${getAppUrl().replace(/\/$/, "")}/api/tickets/${
      params.ticketId
    }/pkpass?t=${encodeURIComponent(token)}`;

    return NextResponse.json({
      url,
      expiresIn: getWalletPassTokenTtlSeconds(),
    });
  } catch (error) {
    console.error("pkpass-link error:", error);
    return NextResponse.json(
      { error: "No se pudo generar el enlace del pase" },
      { status: 500 }
    );
  }
}
