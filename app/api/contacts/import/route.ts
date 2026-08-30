import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function parseCsv(text: string): Array<{ email?: string; name?: string; phone?: string }> {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const split = (line: string) => {
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === "," && !inQ) {
        cols.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  };

  const header = split(lines[0]).map((h) => h.toLowerCase());
  const emailIdx = header.findIndex((h) => h === "email" || h === "correo");
  const nameIdx = header.findIndex(
    (h) => h === "name" || h === "nombre" || h === "full_name"
  );
  const phoneIdx = header.findIndex(
    (h) => h === "phone" || h === "telefono" || h === "teléfono" || h === "tel"
  );

  const hasHeader = emailIdx >= 0 || nameIdx >= 0 || phoneIdx >= 0;
  const start = hasHeader ? 1 : 0;
  const rows: Array<{ email?: string; name?: string; phone?: string }> = [];

  for (let i = start; i < lines.length; i++) {
    const cols = split(lines[i]);
    if (hasHeader) {
      rows.push({
        email: emailIdx >= 0 ? cols[emailIdx] || undefined : undefined,
        name: nameIdx >= 0 ? cols[nameIdx] || undefined : undefined,
        phone: phoneIdx >= 0 ? cols[phoneIdx] || undefined : undefined,
      });
    } else {
      // email,name,phone
      rows.push({
        email: cols[0] || undefined,
        name: cols[1] || undefined,
        phone: cols[2] || undefined,
      });
    }
  }
  return rows;
}

/**
 * POST /api/contacts/import — multipart CSV (email,name,phone)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Archivo CSV requerido (campo file)" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV vacío o sin filas válidas" },
        { status: 400 }
      );
    }

    const contactImport = await prisma.contactImport.create({
      data: {
        userId: user.id,
        fileName: file.name || "contacts.csv",
        totalRows: rows.length,
        status: "PENDING",
      },
    });

    let imported = 0;
    let failed = 0;
    const batch: Array<{
      importId: string;
      email: string | null;
      name: string | null;
      phone: string | null;
    }> = [];

    for (const row of rows) {
      const email = row.email?.trim().toLowerCase() || null;
      const name = row.name?.trim() || null;
      const phone = row.phone?.trim() || null;
      if (!email && !phone && !name) {
        failed++;
        continue;
      }
      batch.push({
        importId: contactImport.id,
        email,
        name,
        phone,
      });
      imported++;
    }

    if (batch.length) {
      await prisma.importedContact.createMany({ data: batch });
    }

    const updated = await prisma.contactImport.update({
      where: { id: contactImport.id },
      data: {
        importedRows: imported,
        failedRows: failed,
        status: "DONE",
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[contacts import]", error);
    return NextResponse.json(
      { error: "Error al importar contactos" },
      { status: 500 }
    );
  }
}
