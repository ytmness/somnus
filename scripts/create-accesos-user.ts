/**
 * Script para crear un usuario de prueba con rol ACCESOS
 * Ejecutar: npx tsx scripts/create-accesos-user.ts
 */

import { prisma } from "../lib/db/prisma";
import { supabaseAdmin } from "../lib/db/supabase";

async function main() {
  const email = "accesos@boletera.com";
  const name = "Operador de Accesos";
  const role = "ACCESOS";

  console.log("🔐 Creando usuario de accesos...");

  try {
    // 1. Verificar si el usuario ya existe en la tabla User
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      console.log("✅ Usuario ya existe en la base de datos");
      console.log({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } else {
      // 2. Crear usuario en Supabase Auth
      console.log("📧 Creando usuario en Supabase Auth...");
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true, // Email ya verificado
        user_metadata: {
          name,
        },
      });

      if (authError) {
        console.error("❌ Error al crear usuario en Supabase:", authError);
        throw authError;
      }

      console.log("✅ Usuario creado en Supabase Auth");

      // 3. Crear usuario en tabla User
      console.log("💾 Creando usuario en base de datos...");
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: role as any,
          password: "", // No se usa con Supabase Auth
          isActive: true,
          emailVerified: true,
        },
      });

      console.log("✅ Usuario creado en base de datos");
    }

    console.log("\n🎉 Usuario de accesos listo:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Nombre: ${name}`);
    console.log(`🔑 Rol: ${role}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log("\n📝 Para iniciar sesión:");
    console.log("1. Ve a /login");
    console.log(`2. Ingresa el email: ${email}`);
    console.log("3. Solicita un código OTP");
    console.log("4. Revisa el código en Supabase Dashboard > Authentication > Logs");
    console.log("5. Una vez iniciada la sesión, ve a /accesos");

    console.log("\n💡 Tip: Si ya existe, puedes generar un nuevo OTP desde el login");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


