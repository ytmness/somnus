/**
 * Tests de lógica de auth (sin BD ni Supabase).
 * Ejecutar: npx tsx scripts/test-auth-logic.ts
 */

import {
  canViewOwnTickets,
  resolvePostAuthRedirect,
  resolvePublicRegistrationRole,
} from "../lib/auth/registration";
import { loginSchema, registerSchema, otpVerifySchema } from "../lib/validations/schemas";

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

console.log("\n=== registerSchema ===");
const validRegister = registerSchema.safeParse({
  email: "test@somnus.live",
  name: "Sergio Test",
  phone: "8112345678",
  password: "password123",
  confirmPassword: "password123",
});
assert(validRegister.success, "registro válido con teléfono");

const invalidPhone = registerSchema.safeParse({
  email: "test@somnus.live",
  name: "Sergio",
  phone: "123",
  password: "password123",
  confirmPassword: "password123",
});
assert(!invalidPhone.success, "rechaza teléfono corto");

const noPhone = registerSchema.safeParse({
  email: "test@somnus.live",
  name: "Sergio",
  password: "password123",
  confirmPassword: "password123",
});
assert(noPhone.success, "teléfono opcional");

const mismatchPassword = registerSchema.safeParse({
  email: "test@somnus.live",
  name: "Sergio",
  password: "password123",
  confirmPassword: "different",
});
assert(!mismatchPassword.success, "rechaza contraseñas distintas");

console.log("\n=== loginSchema ===");
assert(
  loginSchema.safeParse({ email: "a@b.com", password: "password123" }).success,
  "email y contraseña válidos"
);
assert(!loginSchema.safeParse({ email: "no-email", password: "password123" }).success, "email inválido");
assert(!loginSchema.safeParse({ email: "a@b.com", password: "short" }).success, "contraseña corta");

console.log("\n=== otpVerifySchema ===");
assert(
  otpVerifySchema.safeParse({ email: "a@b.com", code: "12345678" }).success,
  "OTP 8 dígitos"
);
assert(
  !otpVerifySchema.safeParse({ email: "a@b.com", code: "1234" }).success,
  "rechaza OTP corto"
);

console.log("\n=== resolvePublicRegistrationRole ===");
assert(resolvePublicRegistrationRole() === "ORGANIZER", "registro público → ORGANIZER");

console.log("\n=== resolvePostAuthRedirect ===");
assert(resolvePostAuthRedirect("ORGANIZER") === "/", "ORGANIZER web → landing");
assert(
  resolvePostAuthRedirect("ORGANIZER", undefined, "app") === "/organizador",
  "ORGANIZER app → organizador"
);
assert(resolvePostAuthRedirect("CLIENTE") === "/", "CLIENTE → home");
assert(resolvePostAuthRedirect("ADMIN") === "/admin", "ADMIN → admin");
assert(resolvePostAuthRedirect("ACCESOS") === "/accesos", "ACCESOS → accesos");
assert(resolvePostAuthRedirect("VENDEDOR") === "/vendedor", "VENDEDOR → vendedor");
assert(resolvePostAuthRedirect("SUPERVISOR") === "/supervisor", "SUPERVISOR → supervisor");

console.log("\n=== canViewOwnTickets ===");
assert(canViewOwnTickets("ORGANIZER"), "ORGANIZER puede ver boletos");
assert(canViewOwnTickets("CLIENTE"), "CLIENTE puede ver boletos");
assert(!canViewOwnTickets("ACCESOS"), "ACCESOS no ve boletos de compra");

console.log(`\n--- Resultado: ${passed} ok, ${failed} fallos ---\n`);
process.exit(failed > 0 ? 1 : 0);
