import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession, hasRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;
const STATEMENT_TIMEOUT_MS = 15_000;

function stripTrailingSemicolons(sql: string): string {
  return sql.trim().replace(/;+\s*$/g, "").trim();
}

function hasMultipleStatements(sql: string): boolean {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === ";" && !inSingle && !inDouble) return true;
  }
  return false;
}

function isSelectLike(sql: string): boolean {
  const head = sql.replace(/^\s*\(/, "").trim().toLowerCase();
  return (
    head.startsWith("select") ||
    head.startsWith("with") ||
    head.startsWith("show") ||
    head.startsWith("explain")
  );
}

function serializeRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === "bigint") out[k] = v.toString();
      else if (v instanceof Date) out[k] = v.toISOString();
      else if (Buffer.isBuffer(v)) out[k] = `[Buffer ${v.length}b]`;
      else out[k] = v;
    }
    return out;
  });
}

/**
 * POST /api/admin/sql
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const raw = typeof body.sql === "string" ? body.sql : "";
    const sql = stripTrailingSemicolons(raw);

    if (!sql) {
      return NextResponse.json({ error: "SQL vacío" }, { status: 400 });
    }
    if (sql.length > 50_000) {
      return NextResponse.json({ error: "SQL demasiado largo" }, { status: 400 });
    }
    if (hasMultipleStatements(sql)) {
      return NextResponse.json(
        { error: "Solo se permite una sentencia por request" },
        { status: 400 }
      );
    }

    const confirmWrite = body.confirmWrite === true;
    const selectLike = isSelectLike(sql);

    if (!selectLike && !confirmWrite) {
      return NextResponse.json(
        {
          error: "Las sentencias de escritura requieren confirmWrite: true",
          requiresConfirmation: true,
        },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = request.headers.get("user-agent") || null;

    if (selectLike) {
      const limitedSql = /\blimit\b/i.test(sql)
        ? sql
        : `${sql} LIMIT ${MAX_ROWS}`;

      const serialized = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}'`
        );
        const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
          limitedSql
        );
        return serializeRows(rows);
      });

      await prisma.auditLog.create({
        data: {
          userId: user!.id,
          action: "SQL_EXECUTED",
          entityType: "SqlEditor",
          entityId: "select",
          changes: {
            sql: sql.slice(0, 4000),
            rowCount: serialized.length,
            kind: "select",
          },
          ipAddress: ip,
          userAgent: ua,
        },
      });

      return NextResponse.json({
        success: true,
        kind: "select",
        columns: serialized[0] ? Object.keys(serialized[0]) : [],
        rows: serialized,
        rowCount: serialized.length,
        truncatedHint: !/\blimit\b/i.test(sql)
          ? `Se aplicó LIMIT ${MAX_ROWS} automáticamente`
          : null,
      });
    }

    const affected = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}'`
      );
      return tx.$executeRawUnsafe(sql);
    });

    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: "SQL_EXECUTED",
        entityType: "SqlEditor",
        entityId: "write",
        changes: {
          sql: sql.slice(0, 4000),
          affected,
          kind: "write",
        },
        ipAddress: ip,
        userAgent: ua,
      },
    });

    return NextResponse.json({
      success: true,
      kind: "write",
      affected,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[admin/sql]", msg);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: msg, code: error.code }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const logs = await prisma.auditLog.findMany({
      where: { action: "SQL_EXECUTED" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        createdAt: true,
        changes: true,
        userId: true,
        user: { select: { email: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, history: logs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
