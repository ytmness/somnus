import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/contact
 * Recibir leads del formulario de contacto de la home
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, lastName, email, phone, country, city, agreedToTerms } = body;

    if (!name?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Nombre, apellido y email son requeridos" },
        { status: 400 }
      );
    }

    if (agreedToTerms !== true) {
      return NextResponse.json(
        { error: "Debes aceptar la política de privacidad y condiciones de uso" },
        { status: 400 }
      );
    }

    await prisma.contactLead.create({
      data: {
        name: name.trim().slice(0, 100),
        lastName: lastName.trim().slice(0, 100),
        email: email.trim().toLowerCase().slice(0, 255),
        phone: phone?.trim()?.slice(0, 50) || null,
        country: country?.trim()?.slice(0, 100) || null,
        city: city?.trim()?.slice(0, 100) || null,
        agreedToTerms: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "¡Gracias! Te contactaremos pronto.",
    });
  } catch (err) {
    console.error("[Contact API]", err);
    return NextResponse.json(
      { error: "Error al enviar. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
