/**
 * Tests de lógica Guest List / cortesías (sin BD).
 * Ejecutar: npx tsx scripts/test-guestlist-logic.ts
 */

import {
  emailsMatch,
  guestListErrorMessage,
  GUESTLIST_STATUS_LABELS,
} from "../lib/guestlist";
import { sanitizeRedirectPath } from "../lib/auth/redirect-path";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

console.log("\n=== GUESTLIST_STATUS_LABELS ===");
assert(GUESTLIST_STATUS_LABELS.PENDING === "Pendiente", "PENDING en español");
assert(GUESTLIST_STATUS_LABELS.USED === "Canjeada", "USED en español");
assert(GUESTLIST_STATUS_LABELS.CANCELLED === "Cancelada", "CANCELLED en español");

console.log("\n=== guestListErrorMessage ===");
assert(
  guestListErrorMessage(null, { notFound: true }).includes("no existe"),
  "mensaje no encontrada"
);
assert(
  guestListErrorMessage("CANCELLED").toLowerCase().includes("cancelad"),
  "mensaje cancelada"
);
assert(
  guestListErrorMessage("USED", { claimedByOther: true }).includes("otra persona"),
  "mensaje canjeada por otra persona"
);

console.log("\n=== emailsMatch ===");
assert(emailsMatch("A@B.com", "a@b.com"), "emails case-insensitive");
assert(!emailsMatch("a@b.com", "c@d.com"), "emails distintos");
assert(!emailsMatch(null, "a@b.com"), "null no coincide");

console.log("\n=== sanitizeRedirectPath guestlist ===");
assert(
  sanitizeRedirectPath("/guestlist/abc-token") === "/guestlist/abc-token",
  "permite redirect a /guestlist/[token]"
);
assert(
  sanitizeRedirectPath("/guestlist") === "/guestlist",
  "permite /guestlist"
);
assert(
  sanitizeRedirectPath("https://evil.com") === null,
  "bloquea URL absoluta"
);

console.log(`\nResultado: ${passed} ok, ${failed} fallidos`);
process.exit(failed > 0 ? 1 : 0);
