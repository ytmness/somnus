/**
 * Crear usuario ADMIN para panel de administración
 * Ejecutar: npx tsx scripts/create-admin-user.ts
 *
 * Opción: pasar email por variable de entorno
 * ADMIN_EMAIL=tu@email.com npx tsx scripts/create-admin-user.ts
 */

import { prisma } from "../lib/db/prisma";
import { supabaseAdmin } from "../lib/db/supabase";

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@somnus.com";
  const name = process.env.ADMIN_NAME || "Administrador Somnus";
  const role = "ADMIN";

  console.log("🔐 Creando usuario ADMIN...\n");

  try {
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN", isActive: true },
      });
      console.log("✅ Usuario existente actualizado a ADMIN");
      user = await prisma.user.findUnique({ where: { email } });
    } else {
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { name },
        });

      if (authError) {
        console.error("❌ Error Supabase:", authError.message);
        throw authError;
      }

      user = await prisma.user.create({
        data: {
          email,
          name,
          role: role as any,
          password: "",
          isActive: true,
          emailVerified: true,
        },
      });
      console.log("✅ Usuario ADMIN creado");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Nombre: ${name}`);
    console.log(`🔑 Rol: ${role}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📝 Para acceder al panel:");
    console.log("1. Ve a tu-sitio.com/login");
    console.log(`2. Ingresa: ${email}`);
    console.log("3. Solicita código OTP");
    console.log("4. El código aparece en Supabase > Auth > Logs (o en tu email)");
    console.log("5. Después del login ve a /admin\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
