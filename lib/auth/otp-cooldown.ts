/**
 * Cooldown por email para no llamar a Supabase OTP más de una vez por minuto por email.
 * Ayuda cuando Supabase tiene límite bajo (ej. 2 emails/h).
 */
const lastOtpSentAt = new Map<string, number>();
const OTP_COOLDOWN_MS = 60_000; // 1 minuto

function cleanupOldEntries() {
  const cutoff = Date.now() - OTP_COOLDOWN_MS;
  Array.from(lastOtpSentAt.entries()).forEach(([email, at]) => {
    if (at < cutoff) lastOtpSentAt.delete(email);
  });
}

export function isInOtpCooldown(email: string): boolean {
  const key = email.trim().toLowerCase();
  cleanupOldEntries();
  const last = lastOtpSentAt.get(key);
  return !!(last && Date.now() - last < OTP_COOLDOWN_MS);
}

export function markOtpSent(email: string): void {
  lastOtpSentAt.set(email.trim().toLowerCase(), Date.now());
}
