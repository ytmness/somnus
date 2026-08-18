import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { buildProfileForUserId, normalizeInstagram } from "@/lib/profile";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/me — perfil propio (público + privado)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const profile = await buildProfileForUserId(session.id, {
      includePrivate: true,
    });
    if (!profile) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("[profile/me GET]", error);
    return NextResponse.json({ error: "Error al cargar perfil" }, { status: 500 });
  }
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  instagramUsername: z.string().trim().max(80).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  smsOptIn: z.boolean().optional(),
  avatarUrl: z.string().trim().max(500).nullable().optional(),
  backgroundUrl: z.string().trim().max(500).nullable().optional(),
});

/**
 * PATCH /api/profile/me — actualizar campos de perfil / settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    const p = parsed.data;

    if (p.name !== undefined) data.name = p.name;
    if (p.bio !== undefined) data.bio = p.bio?.trim() || null;
    if (p.instagramUsername !== undefined) {
      data.instagramUsername = normalizeInstagram(p.instagramUsername);
    }
    if (p.phone !== undefined) data.phone = p.phone?.trim() || null;
    if (p.smsOptIn !== undefined) data.smsOptIn = p.smsOptIn;
    if (p.avatarUrl !== undefined) data.avatarUrl = p.avatarUrl || null;
    if (p.backgroundUrl !== undefined) data.backgroundUrl = p.backgroundUrl || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.id },
      data,
    });

    const profile = await buildProfileForUserId(session.id, {
      includePrivate: true,
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("[profile/me PATCH]", error);
    return NextResponse.json({ error: "Error al guardar perfil" }, { status: 500 });
  }
}
