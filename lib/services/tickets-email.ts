import { generateQRPayload, generateQRCode } from "@/lib/services/qr-generator";
import { sendMailOrThrow } from "@/lib/services/mailer";
import { wrapSomnusEmail, SOMNUS_SUPPORT_EMAIL } from "@/lib/services/email-brand";
import { formatEventCalendarDate } from "@/lib/utils";
import type { Ticket } from "@prisma/client";

type TicketWithRelations = Ticket & {
  ticketType: {
    name: string;
    category: string;
    event: {
      name: string;
      artist: string | null;
      venue: string | null;
      address: string | null;
      eventDate: Date;
      eventTime: string | null;
      imageUrl: string | null;
      showQR: boolean | null;
    };
  };
};

function mxnFormat(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(n);
}

function safeText(s: unknown) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendTicketsReceiptEmail(params: {
  saleId: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone?: string | null;
  eventName: string;
  appUrl: string;
  total: number;
  subtotal: number;
  tax: number;
  tickets: TicketWithRelations[];
}) {
  const {
    buyerEmail,
    buyerName,
    appUrl,
    total,
    subtotal,
    tax,
    tickets,
    eventName,
  } = params;

  const event = tickets[0]?.ticketType?.event;
  const eventMeta = [
    event?.venue ? safeText(event.venue) : "",
    event?.eventDate ? safeText(formatEventCalendarDate(event.eventDate, "es-MX")) : "",
    event?.eventTime ? safeText(event.eventTime) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const ticketCards: string[] = [];
  for (const t of tickets) {
    const qrPayload = generateQRPayload(t.id, String(t.qrCode));
    const qrDataUrl = await generateQRCode(qrPayload);
    const ticketLine = t.tableNumber
      ? `Mesa ${safeText(t.tableNumber)}${t.seatNumber ? ` · Asiento ${t.seatNumber}` : ""}`
      : safeText(t.ticketType.name);

    ticketCards.push(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;">
        <tr>
          <td style="padding:16px;background:#1A1A1A;border:1px solid #2C2C2C;border-radius:10px;">
            <div style="font-family:Arial,Helvetica,sans-serif;color:#F4F4F4;font-weight:700;font-size:14px;">
              ${safeText(t.ticketType.name)}${t.tableNumber ? ` · ${safeText(t.tableNumber)}` : ""}
            </div>
            <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;color:#C8C8C8;font-size:12px;line-height:1.5;">
              Folio <span style="color:#F4F4F4;font-weight:700;">${safeText(t.ticketNumber)}</span><br/>
              ${ticketLine}
            </div>
            <div style="margin-top:12px;background:#FFFFFF;border-radius:8px;padding:12px;text-align:center;">
              <img src="${qrDataUrl}" alt="QR Somnus" width="160" height="160" style="width:160px;height:160px;display:block;margin:0 auto;border:0;" />
              <div style="margin-top:8px;font-family:Arial,Helvetica,sans-serif;color:#121212;font-weight:700;font-size:11px;letter-spacing:0.06em;">
                ${safeText(t.ticketNumber)}
              </div>
            </div>
            <div style="margin-top:10px;text-align:center;font-family:Arial,Helvetica,sans-serif;color:#7BA3E8;font-weight:700;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;">
              Escanear en acceso
            </div>
          </td>
        </tr>
      </table>
    `);
  }

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:14px 0 18px 0;border-top:1px solid #2C2C2C;">
          <div style="font-family:Arial,Helvetica,sans-serif;color:#7BA3E8;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
            Evento
          </div>
          <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;color:#F4F4F4;font-size:18px;font-weight:700;">
            ${safeText(eventName || "Evento")}
          </div>
          ${
            eventMeta
              ? `<div style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;color:#C8C8C8;font-size:13px;">${eventMeta}</div>`
              : ""
          }
        </td>
      </tr>
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" valign="top" style="padding:0 6px 0 0;">
                <div style="padding:12px;background:#1A1A1A;border:1px solid #2C2C2C;border-radius:8px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#C8C8C8;font-size:11px;">Subtotal</div>
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#F4F4F4;font-size:16px;font-weight:700;">${mxnFormat(subtotal)}</div>
                </div>
              </td>
              <td width="50%" valign="top" style="padding:0 0 0 6px;">
                <div style="padding:12px;background:#1A1A1A;border:1px solid #2C2C2C;border-radius:8px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#C8C8C8;font-size:11px;">Impuestos</div>
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#F4F4F4;font-size:16px;font-weight:700;">${mxnFormat(tax)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:14px;">
                <div style="font-family:Arial,Helvetica,sans-serif;color:#7BA3E8;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Total</div>
                <div style="font-family:Arial,Helvetica,sans-serif;color:#F4F4F4;font-size:28px;font-weight:700;">${mxnFormat(total)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 0 8px 0;">
          <div style="font-family:Arial,Helvetica,sans-serif;color:#F4F4F4;font-size:15px;font-weight:700;margin-bottom:10px;">
            Tus códigos QR
          </div>
          ${ticketCards.join("")}
        </td>
      </tr>
    </table>
  `;

  const html = wrapSomnusEmail({
    appUrl,
    preheader: `Tus boletos Somnus para ${eventName || "el evento"}`,
    heading: `Listo, ${safeText(buyerName)}.`,
    subheading: "Guarda este correo. El QR es tu acceso al evento.",
    bodyHtml,
    cta: { href: `${appUrl.replace(/\/$/, "")}/mis-boletos`, label: "Ver mis boletos" },
    footerNote: `Muestra el QR en la entrada. Si necesitas ayuda, escribe a ${SOMNUS_SUPPORT_EMAIL}.`,
  });

  const text = `SOMNUS
Tus boletos para ${eventName || "el evento"}.
Total: ${mxnFormat(total)}.
Abre tus boletos en ${appUrl.replace(/\/$/, "")}/mis-boletos
Ayuda: ${SOMNUS_SUPPORT_EMAIL}`;

  await sendMailOrThrow({
    to: buyerEmail,
    subject: `Tus boletos Somnus · ${eventName || "Recibo"}`,
    text,
    html,
  });

  return true;
}
