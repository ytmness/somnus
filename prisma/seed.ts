import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// #region agent log
const logPath = path.resolve('.cursor', 'debug.log');
const logEntry = (msg: string, data: any, hypothesisId: string) => {
  const entry = JSON.stringify({location:'prisma/seed.ts',message:msg,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId});
  // Always log to console
  console.log(`[DEBUG ${hypothesisId}] ${msg}:`, JSON.stringify(data, null, 2));
  // Try to write to file
  try {
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(logPath, entry + '\n', 'utf8');
  } catch (e: any) {
    console.error('[DEBUG] Log file write error:', e.message);
  }
};
// Write immediately on import
console.log('[DEBUG] ===== SCRIPT STARTING =====');
logEntry('Script started',{cwd:process.cwd(),logPath,nodeVersion:process.version},'A');
const dbUrlFull = process.env.DATABASE_URL || '';
logEntry('DATABASE_URL env var',{
  databaseUrl:dbUrlFull.substring(0,100)+'...',
  hasDatabaseUrl:!!process.env.DATABASE_URL,
  fullLength:dbUrlFull.length,
  fullUrl:dbUrlFull // Log completo para debugging
},'A');
logEntry('DIRECT_URL env var',{directUrl:process.env.DIRECT_URL?.substring(0,100)+'...',hasDirectUrl:!!process.env.DIRECT_URL,fullLength:process.env.DIRECT_URL?.length},'A');
// #endregion

const prisma = new PrismaClient();

async function main() {
  // #region agent log
  const dbUrl = process.env.DATABASE_URL || '';
  let parsedUrl: any = null;
  try {
    const url = new URL(dbUrl);
    parsedUrl = {
      protocol: url.protocol,
      username: url.username,
      password: url.password ? '***' : null,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search
    };
  } catch (e) {
    parsedUrl = { error: String(e) };
  }
  logEntry('Parsed DATABASE_URL',parsedUrl,'B');
  // #endregion
  
  console.log("🌱 Seeding database...");

  // Crear usuario admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  
  // #region agent log
  logEntry('Before prisma.user.upsert',{step:'about_to_connect'},'C');
  // #endregion
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@grupoRegia.com" },
    update: {},
    create: {
      email: "admin@grupoRegia.com",
      password: adminPassword,
      name: "Admin Regia",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Usuario admin creado:", admin.email);

  // Crear usuario vendedor
  const vendedorPassword = await bcrypt.hash("vendedor123", 10);
  const vendedor = await prisma.user.upsert({
    where: { email: "vendedor@grupoRegia.com" },
    update: {},
    create: {
      email: "vendedor@grupoRegia.com",
      password: vendedorPassword,
      name: "Vendedor Regia",
      role: "VENDEDOR",
      isActive: true,
    },
  });

  console.log("✅ Usuario vendedor creado:", vendedor.email);

  // Crear evento de ejemplo (Víctor Mendivil)
  const event = await prisma.event.create({
    data: {
      name: "Víctor Mendivil en Concierto",
      description: "Gran concierto de Víctor Mendivil en Arena Monterrey",
      artist: "Víctor Mendivil",
      tour: "Gira 2025",
      venue: "Arena Monterrey",
      address: "Av. Fundidora, Monterrey, NL",
      eventDate: new Date("2025-03-15T21:00:00"),
      eventTime: "21:00 hrs",
      imageUrl: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200",
      maxCapacity: 5000,
      salesStartDate: new Date(),
      salesEndDate: new Date("2025-03-15T18:00:00"),
      isActive: true,
      ticketTypes: {
        create: [
          {
            name: "VIP - Mesa 4 personas",
            description: "Mesa VIP con 4 asientos, acceso preferente",
            category: "VIP",
            price: 2500,
            maxQuantity: 162,
            soldQuantity: 0,
            isTable: true,
            seatsPerTable: 4,
          },
          {
            name: "Preferente",
            description: "Asientos numerados, excelente vista",
            category: "PREFERENTE",
            price: 1500,
            maxQuantity: 120,
            soldQuantity: 0,
          },
          {
            name: "General",
            description: "De pie, cerca del escenario",
            category: "GENERAL",
            price: 850,
            maxQuantity: 350,
            soldQuantity: 0,
          },
        ],
      },
    },
  });

  console.log("✅ Evento de ejemplo creado:", event.name);

  console.log("\n🎉 Seed completado!\n");
  console.log("📝 Credenciales de acceso:");
  console.log("   Admin:");
  console.log("   - Email: admin@grupoRegia.com");
  console.log("   - Password: admin123\n");
  console.log("   Vendedor:");
  console.log("   - Email: vendedor@grupoRegia.com");
  console.log("   - Password: vendedor123\n");
}

main()
  .catch((e) => {
    // #region agent log
    logEntry('Error caught',{errorMessage:e.message,errorCode:e.code,errorName:e.name,stack:e.stack?.substring(0,200)},'D');
    // #endregion
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

