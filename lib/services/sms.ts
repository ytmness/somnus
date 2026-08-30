export type SendSmsParams = {
  to: string;
  body: string;
};

export type SendSmsResult = {
  ok: boolean;
  skipped?: boolean;
  sid?: string;
  error?: string;
};

/**
 * Envía SMS vía Twilio REST API.
 * Si faltan credenciales, registra y hace no-op.
 */
export async function sendSms({
  to,
  body,
}: SendSmsParams): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM?.trim();

  if (!accountSid || !authToken || !from) {
    console.log(
      "[sms] Twilio no configurado (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM) — skip",
      { to, bodyPreview: body.slice(0, 80) }
    );
    return { ok: false, skipped: true };
  }

  const normalizedTo = to.replace(/\s+/g, "");
  if (!normalizedTo) {
    return { ok: false, error: "Teléfono vacío" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const params = new URLSearchParams({
      To: normalizedTo,
      From: from,
      Body: body,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = (await res.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
      error_message?: string;
    };

    if (!res.ok) {
      const error =
        data.message || data.error_message || `Twilio HTTP ${res.status}`;
      console.error("[sms] Error Twilio:", error);
      return { ok: false, error };
    }

    return { ok: true, sid: data.sid };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[sms] Exception:", error);
    return { ok: false, error };
  }
}
