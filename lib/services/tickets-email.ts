import nodemailer from "nodemailer";
import { generateQRPayload, generateQRCode } from "@/lib/services/qr-generator";
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
    buyerPhone,
  } = params;

  const logoUrl = `${appUrl}/assets/logo.png`;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || "Somnus";

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    throw new Error("SMTP no configurado en variables de entorno");
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // 465 => SSL
    auth: { user: smtpUser, pass: smtpPass },
  });

  // Inline QR como data URL (sin adjuntos tradicionales)
  const ticketCards: string[] = [];
  for (const t of tickets) {
    const qrPayload = generateQRPayload(t.id, String(t.qrCode));
    const qrDataUrl = await generateQRCode(qrPayload);
    const ticketLine = t.tableNumber
      ? `Mesa: ${safeText(t.tableNumber)}${t.seatNumber ? ` • Asiento ${t.seatNumber}` : ""}`
      : `Ticket`;

    ticketCards.push(`
      <div style="margin:12px 0;padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(91,141,239,0.18);">
        <div style="display:flex;flex-direction:column;gap:6px;">
          <div style="font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;font-weight:800;font-size:14px;">
            ${safeText(t.ticketType.name)} ${t.tableNumber ? `• ${safeText(t.tableNumber)}` : ""}
          </div>
          <div style="font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.70);font-size:12px;line-height:1.5;">
            Folio: <span style="color:#FFFFFF;font-weight:700;">${safeText(t.ticketNumber)}</span><br/>
            ${safeText(ticketLine)}
          </div>
          <div style="margin-top:10px;background:#FFFFFF;border-radius:14px;padding:10px;text-align:center;">
            <img src="${qrDataUrl}" alt="QR" style="width:160px;height:auto;display:block;margin:0 auto;"/>
            <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;color:#2a2c30;font-weight:800;font-size:11px;">
              ${safeText(t.ticketNumber)}
            </div>
          </div>
          <div style="margin-top:10px;text-align:center;font-family:Arial,Helvetica,sans-serif;color:#7BA3E8;font-weight:900;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">
            Escanear en acceso
          </div>
        </div>
      </div>
    `);
  }

  const html = `
  <!doctype html>
  <html>
    <body style="margin:0;padding:0;background:#0A0A0A;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
              
              <tr>
                <td style="padding:18px 20px;background:#0A0A0A;border-bottom:1px solid rgba(255,255,255,0.08);">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="left">
                        <img src="${logoUrl}" alt="Somnus" width="120" style="display:block;height:auto;opacity:0.95;" />
                      </td>
                      <td align="right" style="font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.65);font-size:12px;">
                        Recibo completo
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px 8px 20px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;font-size:26px;font-weight:900;line-height:1.2;">
                    Gracias por tus boletos, ${safeText(buyerName)}.
                  </div>
                  <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.65);font-size:14px;">
                    Aquí tienes tu comprobante con tus códigos QR.
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 20px 6px 20px;">
                  <div style="padding-top:14px;border-top:1px solid rgba(255,255,255,0.10);">
                    <div style="font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;font-size:16px;font-weight:900;">
                      ${safeText(eventName || "Evento")}
                    </div>
                    ${
                      tickets[0]?.ticketType?.event?.venue
                        ? `<div style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.70);font-size:13px;">${safeText(tickets[0].ticketType.event.venue)}</div>`
                        : ""
                    }
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 20px 14px 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                    <tr>
                      <td style="width:50%;padding:10px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.65);font-size:12px;">Subtotal</div>
                        <div style="font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;font-size:18px;font-weight:900;">${mxnFormat(subtotal)}</div>
                      </td>
                      <td style="width:50%;padding:10px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.65);font-size:12px;">Impuestos</div>
                        <div style="font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;font-size:18px;font-weight:900;">${mxnFormat(tax)}</div>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding-top:10px;">
                        <div style="font-family:Arial,Helvetica,sans-serif;color:#7BA3E8;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;">Total</div>
                        <div style="font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;font-size:30px;font-weight:1000;">${mxnFormat(total)}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 20px 20px 20px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;font-size:16px;font-weight:900;margin-bottom:10px;">
                    Tus códigos QR
                  </div>
                  ${ticketCards.join("")}
                  
                  <div style="margin-top:10px;font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.60);font-size:12px;line-height:1.6;">
                    Leyenda: utiliza estos QR en la entrada del evento. Los QR se validan al momento del acceso.
                  </div>
                  <div style="margin-top:10px;font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.6;">
                    Si necesitas ayuda, responde este correo o contacta a <span style="color:#7BA3E8;font-weight:900;">tickets@somnus.live</span>.
                  </div>
                  
                  <div style="margin-top:14px;text-align:center;">
                    <a href="${appUrl}/mis-boletos" style="display:inline-block;padding:12px 16px;border-radius:14px;background:#5B8DEF;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-weight:900;text-decoration:none;">
                      Ver mis boletos
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;background:#070707;border-top:1px solid rgba(255,255,255,0.08);">
                  <div style="font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.45);font-size:12px;text-align:center;">
                    © ${new Date().getFullYear()} Somnus. Todos los derechos reservados.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  const text = `Gracias por tus boletos, ${buyerName}.
Recibo completo: ${mxnFormat(total)}.
Tus boletos y códigos QR se muestran dentro del correo. 
Si tienes problemas, contáctanos en tickets@somnus.live.`;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: buyerEmail,
    subject: `Tus boletos Somnus - ${eventName || "Recibo"}`,
    text,
    html,
  });

  return true;
}

