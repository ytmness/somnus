/**
 * Verifica variables de entorno del stack propio (sin Supabase).
 * npx tsx scripts/verificar-env.ts
 */
import "dotenv/config";

const required: Record<string, string> = {
  DATABASE_URL: "URL de Postgres",
  DIRECT_URL: "URL directa de Postgres (migraciones)",
  AUTH_SECRET: "Secret de Auth.js (o JWT_SECRET)",
};

const optional: Record<string, string> = {
  JWT_SECRET: "Alias de AUTH_SECRET",
  GOOGLE_CLIENT_ID: "OAuth Google",
  GOOGLE_CLIENT_SECRET: "OAuth Google secret",
  APPLE_ID: "Sign in with Apple",
  RESEND_API_KEY: "Emails OTP / reset",
  UPLOAD_DIR: "Carpeta de uploads locales",
  NEXT_PUBLIC_APP_URL: "URL pública de la app",
};

let ok = true;
console.log("Variables requeridas:");
for (const [key, desc] of Object.entries(required)) {
  const val =
    key === "AUTH_SECRET"
      ? process.env.AUTH_SECRET || process.env.JWT_SECRET
      : process.env[key];
  if (!val) {
    console.log(`  ✗ ${key} — ${desc}`);
    ok = false;
  } else {
    console.log(`  ✓ ${key}`);
  }
}

console.log("\nOpcionales:");
for (const [key, desc] of Object.entries(optional)) {
  console.log(`  ${process.env[key] ? "✓" : "·"} ${key} — ${desc}`);
}

if (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.log(
    "\n⚠️  Todavía hay variables de Supabase en .env; ya no se usan. Puedes eliminarlas."
  );
}

process.exit(ok ? 0 : 1);
