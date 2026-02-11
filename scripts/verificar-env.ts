/**
 * Script para verificar que todas las variables de entorno necesarias estén configuradas
 * 
 * EJECUTAR: npx tsx scripts/verificar-env.ts
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

// Variables requeridas
const REQUIRED_VARS = {
  // Supabase (obligatorias)
  NEXT_PUBLIC_SUPABASE_URL: "URL de tu proyecto Supabase",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "Anon Key pública de Supabase",
  SUPABASE_SERVICE_ROLE_KEY: "Service Role Key de Supabase (para migración)",
  
  // Database (obligatorias)
  DATABASE_URL: "URL de conexión a la base de datos",
  DIRECT_URL: "URL directa de conexión a la base de datos",
};

// Variables opcionales pero recomendadas
const OPTIONAL_VARS = {
  JWT_SECRET: "Secret para tokens JWT (opcional)",
  QR_SECRET_KEY: "Secret para códigos QR (opcional)",
  RESEND_API_KEY: "API Key de Resend para emails (opcional)",
  NEXT_PUBLIC_SITE_URL: "URL del sitio (opcional, por defecto: http://localhost:3000)",
};

console.log("🔍 Verificando variables de entorno...\n");

let hasErrors = false;
const configured: string[] = [];
const missing: string[] = [];

// Verificar variables requeridas
console.log("📋 Variables Requeridas:");
console.log("=".repeat(60));

for (const [key, description] of Object.entries(REQUIRED_VARS)) {
  const value = process.env[key];
  
  if (!value || value.trim() === "") {
    console.log(`❌ ${key}`);
    console.log(`   Descripción: ${description}`);
    console.log(`   Estado: NO CONFIGURADA\n`);
    missing.push(key);
    hasErrors = true;
  } else {
    // Mostrar solo los primeros caracteres por seguridad
    const preview = value.length > 30 
      ? `${value.substring(0, 30)}...` 
      : value;
    console.log(`✅ ${key}`);
    console.log(`   Valor: ${preview}`);
    console.log(`   Descripción: ${description}\n`);
    configured.push(key);
  }
}

// Verificar variables opcionales
console.log("\n📋 Variables Opcionales:");
console.log("=".repeat(60));

for (const [key, description] of Object.entries(OPTIONAL_VARS)) {
  const value = process.env[key];
  
  if (!value || value.trim() === "") {
    console.log(`⚪ ${key} - NO CONFIGURADA (${description})`);
  } else {
    const preview = value.length > 30 
      ? `${value.substring(0, 30)}...` 
      : value;
    console.log(`✅ ${key}`);
    console.log(`   Valor: ${preview}`);
  }
}

// Resumen
console.log("\n" + "=".repeat(60));
console.log("📊 RESUMEN");
console.log("=".repeat(60));
console.log(`✅ Configuradas: ${configured.length}/${Object.keys(REQUIRED_VARS).length}`);
console.log(`❌ Faltantes: ${missing.length}`);

if (hasErrors) {
  console.log("\n⚠️  ERROR: Faltan variables requeridas");
  console.log("\nPor favor configura las siguientes variables en .env.local:");
  missing.forEach(key => {
    console.log(`   - ${key}: ${REQUIRED_VARS[key as keyof typeof REQUIRED_VARS]}`);
  });
  console.log("\n💡 Consulta SUPABASE_SETUP.md o CONFIGURACION_INICIAL_SUPABASE_AUTH.md para más información.");
  process.exit(1);
} else {
  console.log("\n✅ ¡Todas las variables requeridas están configuradas!");
  console.log("🚀 El sistema está listo para usar Supabase Auth.");
  
  // Verificar formato de URLs
  console.log("\n🔍 Verificando formato de URLs...");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!supabaseUrl.startsWith("https://") || !supabaseUrl.includes(".supabase.co")) {
    console.log("⚠️  ADVERTENCIA: NEXT_PUBLIC_SUPABASE_URL no parece tener el formato correcto");
    console.log("   Debería ser: https://xxx.supabase.co");
  }
  
  const databaseUrl = process.env.DATABASE_URL!;
  if (!databaseUrl.startsWith("postgresql://")) {
    console.log("⚠️  ADVERTENCIA: DATABASE_URL no parece tener el formato correcto");
    console.log("   Debería ser: postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres");
  }
  
  const directUrl = process.env.DIRECT_URL!;
  if (!directUrl.startsWith("postgresql://")) {
    console.log("⚠️  ADVERTENCIA: DIRECT_URL no parece tener el formato correcto");
  }
  
  console.log("\n✅ Verificación completada!");
  process.exit(0);
}


