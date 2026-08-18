import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  buildTicketPass,
  isWalletPassEnabled,
  WalletPassNotFoundError,
  WalletPassUnavailableError,
} from "@/lib/services/wallet-pass";
import { verifyWalletPassToken } from "@/lib/services/wallet-pass-token";
import { userOwnsTicket } from "@/lib/services/ticket-ownership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/[ticketId]/pkpass?t=<token>
 *
 * Descarga el pase de Apple Wallet del boleto. Acepta el token firmado que
 * emite /pkpass-link (para abrir desde Safari) o la sesión activa (para la web).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  const { ticketId } = params;

  try {
    // La disponibilidad es una propiedad del servidor, no del usuario: se
    // resuelve antes de autenticar para no pegarle a la BD si no hay certificados.
    if (!isWalletPassEnabled()) {
      return NextResponse.json(
        { error: "Apple Wallet no está disponible en este momento" },
        { status: 503 }
      );
    }

    const token = request.nextUrl.searchParams.get("t");
    let authorized = false;

    if (token) {
      authorized = (await verifyWalletPassToken(token, ticketId)) !== null;
    }

    if (!authorized) {
      const user = await getSession();
      if (!user) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      authorized = await userOwnsTicket(user, ticketId);
    }

    if (!authorized) {
      return NextResponse.json(
        { error: "Boleto no encontrado" },
        { status: 404 }
      );
    }

    const { buffer, fileName } = await buildTicketPass(ticketId);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof WalletPassUnavailableError) {
      // Certificados no instalados en este servidor: degradar, no romper.
      return NextResponse.json(
        { error: "Apple Wallet no está disponible en este momento" },
        { status: 503 }
      );
    }

    if (error instanceof WalletPassNotFoundError) {
      return NextResponse.json(
        { error: "Boleto no encontrado" },
        { status: 404 }
      );
    }

    console.error("pkpass error:", error);
    return NextResponse.json(
      { error: "No se pudo generar el pase" },
      { status: 500 }
    );
  }
}
