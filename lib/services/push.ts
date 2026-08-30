export type SendPushParams = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type SendPushResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

/**
 * Stub de push (FCM legacy / server key).
 * Si falta FIREBASE_SERVER_KEY (o FCM_SERVER_KEY), log y skip.
 */
export async function sendPush({
  token,
  title,
  body,
  data,
}: SendPushParams): Promise<SendPushResult> {
  const serverKey =
    process.env.FIREBASE_SERVER_KEY?.trim() ||
    process.env.FCM_SERVER_KEY?.trim() ||
    process.env.FIREBASE_CLOUD_MESSAGING_SERVER_KEY?.trim();

  if (!serverKey) {
    console.log(
      "[push] FIREBASE_SERVER_KEY no configurado — skip",
      { tokenPreview: token.slice(0, 12), title, bodyPreview: body.slice(0, 80) }
    );
    return { ok: false, skipped: true };
  }

  if (!token?.trim()) {
    return { ok: false, error: "Token vacío" };
  }

  try {
    // Legacy FCM HTTP API (stub-friendly; migrate to HTTP v1 when ready)
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${serverKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        notification: { title, body },
        data: data || {},
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[push] FCM error:", res.status, text.slice(0, 200));
      return { ok: false, error: `FCM HTTP ${res.status}` };
    }

    console.log("[push] Enviado", { title, tokenPreview: token.slice(0, 12) });
    return { ok: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[push] Exception:", error);
    return { ok: false, error };
  }
}
