/**
 * Cooldown por email para OTP (1 minuto).
 */
const lastOtpSentAt = new Map<string, number>();
const OTP_COOLDOWN_MS = 60_000;

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
