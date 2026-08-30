import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { userOwnsEvent } from "@/lib/auth/event-access";
import { sendSms } from "@/lib/services/sms";
import { sendPush } from "@/lib/services/push";
import { sendMailOrThrow } from "@/lib/services/mailer";
import { getAppUrl } from "@/lib/payments/config";
import type { BlastChannel } from "@prisma/client";

export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

async function resolvePastBuyers(eventId: string) {
  const sales = await prisma.sale.findMany({
    where: { eventId, status: "COMPLETED" },
    select: {
      buyerEmail: true,
      buyerPhone: true,
      buyerName: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const emails = new Set<string>();
  const phones = new Map<string, string>();
  const byEmail = new Map<string, { email: string; phone: string | null; name: string }>();

  for (const s of sales) {
    const email = s.buyerEmail?.trim().toLowerCase();
    if (!email || emails.has(email)) continue;
    emails.add(email);
    byEmail.set(email, {
      email,
      phone: s.buyerPhone?.trim() || null,
      name: s.buyerName || "",
    });
    if (s.buyerPhone?.trim()) {
      phones.set(email, s.buyerPhone.trim());
    }
  }

  const users = await prisma.user.findMany({
    where: { email: { in: Array.from(emails) } },
    select: { email: true, pushToken: true, phone: true, name: true },
  });
  const userByEmail = new Map(
    users.map((u) => [u.email.toLowerCase(), u])
  );

  return Array.from(byEmail.values()).map((b) => {
    const u = userByEmail.get(b.email);
    return {
      email: b.email,
      name: u?.name || b.name,
      phone: b.phone || u?.phone || null,
      pushToken: u?.pushToken || null,
    };
  });
}

function appendTrackingToBody(
  body: string,
  eventId: string,
  trackingCode: string
): string {
  const appUrl = getAppUrl().replace(/\/$/, "");
  const link = `${appUrl}/eventos/${eventId}/boletos?ref=blast_${trackingCode}`;
  if (body.includes("{{link}}")) {
    return body.split("{{link}}").join(link);
  }
  if (body.includes(link) || body.includes(`blast_${trackingCode}`)) {
    return body;
  }
  return `${body.trim()}\n\n${link}`;
}

/**
 * GET /api/events/[id]/blasts — listar blasts del evento
 * POST — crear y opcionalmente enviar
 */
export async function GET(_request: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!(await userOwnsEvent(user, params.id))) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const blasts = await prisma.campaignBlast.findMany({
      where: { eventId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: blasts });
  } catch (error) {
    console.error("[blasts GET]", error);
    return NextResponse.json({ error: "Error al listar blasts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!(await userOwnsEvent(user, params.id))) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const channel = String(body.channel || "").toUpperCase() as BlastChannel;
    const subject = typeof body.subject === "string" ? body.subject : null;
    const messageBody = typeof body.body === "string" ? body.body.trim() : "";
    const sendNow = body.sendNow !== false;

    if (!["SMS", "PUSH", "EMAIL"].includes(channel)) {
      return NextResponse.json(
        { error: "channel debe ser SMS, PUSH o EMAIL" },
        { status: 400 }
      );
    }
    if (!messageBody) {
      return NextResponse.json({ error: "body es requerido" }, { status: 400 });
    }

    const blast = await prisma.campaignBlast.create({
      data: {
        eventId: event.id,
        channel,
        subject,
        body: messageBody,
        status: sendNow ? "SENDING" : "DRAFT",
        createdById: user.id,
      },
    });

    if (!sendNow) {
      return NextResponse.json({ success: true, data: blast });
    }

    const recipients = await resolvePastBuyers(event.id);
    const trackedBody = appendTrackingToBody(
      messageBody,
      event.id,
      blast.trackingCode
    );
    const emailSubject =
      subject?.trim() || `Somnus · ${event.name}`;

    let sentCount = 0;
    const eligible = recipients.filter((r) => {
      if (channel === "SMS") return !!r.phone;
      if (channel === "PUSH") return !!r.pushToken;
      return !!r.email;
    });

    for (const r of eligible) {
      try {
        if (channel === "SMS" && r.phone) {
          const result = await sendSms({ to: r.phone, body: trackedBody });
          if (result.ok || result.skipped) sentCount++;
        } else if (channel === "PUSH" && r.pushToken) {
          const result = await sendPush({
            token: r.pushToken,
            title: emailSubject,
            body: trackedBody.slice(0, 500),
            data: {
              eventId: event.id,
              blastId: blast.id,
              ref: `blast_${blast.trackingCode}`,
            },
          });
          if (result.ok || result.skipped) sentCount++;
        } else if (channel === "EMAIL") {
          await sendMailOrThrow({
            to: r.email,
            subject: emailSubject,
            html: `<p>${trackedBody.replace(/\n/g, "<br/>")}</p>`,
            text: trackedBody,
          });
          sentCount++;
        }
      } catch (err) {
        console.error(`[blasts] fail ${channel} → ${r.email}:`, err);
      }
    }

    const updated = await prisma.campaignBlast.update({
      where: { id: blast.id },
      data: {
        status: "SENT",
        recipientCount: eligible.length,
        sentCount,
        sentAt: new Date(),
        body: trackedBody,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[blasts POST]", error);
    return NextResponse.json({ error: "Error al crear blast" }, { status: 500 });
  }
}
