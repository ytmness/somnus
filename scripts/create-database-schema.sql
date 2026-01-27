-- =====================================================
-- SCRIPT SQL PARA CREAR SCHEMA COMPLETO EN SUPABASE
-- =====================================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
-- 2. Selecciona el proyecto: rbcqxxbddvbomwarmjvd
-- 3. Ve a SQL Editor
-- 4. Crea una nueva query
-- 5. Copia y pega TODO este script
-- 6. Ejecuta el script (botón RUN o F5)
--
-- NOTA: Este script crea TODAS las tablas, tipos ENUM, índices y relaciones
-- =====================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TIPOS ENUM
-- =====================================================

-- UserRole
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VENDEDOR', 'SUPERVISOR', 'ACCESOS', 'CLIENTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- TicketCategory
DO $$ BEGIN
    CREATE TYPE "TicketCategory" AS ENUM ('GENERAL', 'PREFERENTE', 'VIP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- SaleChannel
DO $$ BEGIN
    CREATE TYPE "SaleChannel" AS ENUM ('ONLINE', 'POS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- SaleStatus
DO $$ BEGIN
    CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- TicketStatus
DO $$ BEGIN
    CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'USED', 'CANCELLED', 'REPRINTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ScanResult
DO $$ BEGIN
    CREATE TYPE "ScanResult" AS ENUM ('SUCCESS', 'ALREADY_USED', 'INVALID', 'CANCELLED', 'EVENT_MISMATCH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AuditAction
DO $$ BEGIN
    CREATE TYPE "AuditAction" AS ENUM (
        'USER_LOGIN',
        'USER_LOGOUT',
        'SALE_CREATED',
        'SALE_COMPLETED',
        'SALE_CANCELLED',
        'TICKET_GENERATED',
        'TICKET_SCANNED',
        'TICKET_REPRINTED',
        'INVENTORY_UPDATED',
        'PRICE_CHANGED',
        'EVENT_CREATED',
        'EVENT_UPDATED',
        'EVENT_DELETED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLAS
-- =====================================================

-- User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VENDEDOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "verificationCodeExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Event
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "artist" TEXT NOT NULL,
    "tour" TEXT,
    "venue" TEXT NOT NULL,
    "address" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventTime" TEXT NOT NULL,
    "imageUrl" TEXT,
    "maxCapacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "salesStartDate" TIMESTAMP(3) NOT NULL,
    "salesEndDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- TicketType
CREATE TABLE IF NOT EXISTS "TicketType" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TicketCategory" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "maxQuantity" INTEGER NOT NULL,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTable" BOOLEAN NOT NULL DEFAULT false,
    "seatsPerTable" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

-- Sale
CREATE TABLE IF NOT EXISTS "Sale" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "SaleChannel" NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "paymentMethod" TEXT,
    "paymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- Ticket
CREATE TABLE IF NOT EXISTS "Ticket" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'VALID',
    "tableNumber" TEXT,
    "seatNumber" INTEGER,
    "pdfUrl" TEXT,
    "scannedAt" TIMESTAMP(3),
    "scannedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- TicketScan
CREATE TABLE IF NOT EXISTS "TicketScan" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "scannedBy" TEXT NOT NULL,
    "result" "ScanResult" NOT NULL,
    "notes" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceInfo" TEXT,
    "location" TEXT,

    CONSTRAINT "TicketScan_pkey" PRIMARY KEY ("id")
);

-- TicketReprint
CREATE TABLE IF NOT EXISTS "TicketReprint" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorizedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reprintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketReprint_pkey" PRIMARY KEY ("id")
);

-- AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- SystemConfig
CREATE TABLE IF NOT EXISTS "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- ÍNDICES
-- =====================================================

-- User indexes
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_emailVerified_idx" ON "User"("emailVerified");

-- Event indexes
CREATE INDEX IF NOT EXISTS "Event_eventDate_idx" ON "Event"("eventDate");
CREATE INDEX IF NOT EXISTS "Event_isActive_idx" ON "Event"("isActive");

-- TicketType indexes
CREATE INDEX IF NOT EXISTS "TicketType_eventId_idx" ON "TicketType"("eventId");
CREATE INDEX IF NOT EXISTS "TicketType_category_idx" ON "TicketType"("category");
CREATE INDEX IF NOT EXISTS "TicketType_isActive_idx" ON "TicketType"("isActive");

-- Sale indexes
CREATE INDEX IF NOT EXISTS "Sale_eventId_idx" ON "Sale"("eventId");
CREATE INDEX IF NOT EXISTS "Sale_status_idx" ON "Sale"("status");
CREATE INDEX IF NOT EXISTS "Sale_createdAt_idx" ON "Sale"("createdAt");
CREATE INDEX IF NOT EXISTS "Sale_buyerEmail_idx" ON "Sale"("buyerEmail");

-- Ticket indexes
CREATE INDEX IF NOT EXISTS "Ticket_qrCode_idx" ON "Ticket"("qrCode");
CREATE INDEX IF NOT EXISTS "Ticket_ticketNumber_idx" ON "Ticket"("ticketNumber");
CREATE INDEX IF NOT EXISTS "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX IF NOT EXISTS "Ticket_saleId_idx" ON "Ticket"("saleId");

-- TicketScan indexes
CREATE INDEX IF NOT EXISTS "TicketScan_ticketId_idx" ON "TicketScan"("ticketId");
CREATE INDEX IF NOT EXISTS "TicketScan_scannedAt_idx" ON "TicketScan"("scannedAt");
CREATE INDEX IF NOT EXISTS "TicketScan_result_idx" ON "TicketScan"("result");

-- TicketReprint indexes
CREATE INDEX IF NOT EXISTS "TicketReprint_ticketId_idx" ON "TicketReprint"("ticketId");
CREATE INDEX IF NOT EXISTS "TicketReprint_reprintedAt_idx" ON "TicketReprint"("reprintedAt");

-- AuditLog indexes
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- SystemConfig indexes
CREATE INDEX IF NOT EXISTS "SystemConfig_key_idx" ON "SystemConfig"("key");

-- =====================================================
-- CONSTRAINTS ÚNICOS
-- =====================================================

-- User unique constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'User_email_key'
    ) THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");
    END IF;
END $$;

-- Ticket unique constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_ticketNumber_key'
    ) THEN
        ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketNumber_key" UNIQUE ("ticketNumber");
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_qrCode_key'
    ) THEN
        ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_qrCode_key" UNIQUE ("qrCode");
    END IF;
END $$;

-- SystemConfig unique constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SystemConfig_key_key'
    ) THEN
        ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_key_key" UNIQUE ("key");
    END IF;
END $$;

-- =====================================================
-- FOREIGN KEYS
-- =====================================================

-- TicketType -> Event
ALTER TABLE "TicketType" 
    DROP CONSTRAINT IF EXISTS "TicketType_eventId_fkey",
    ADD CONSTRAINT "TicketType_eventId_fkey" 
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sale -> Event
ALTER TABLE "Sale" 
    DROP CONSTRAINT IF EXISTS "Sale_eventId_fkey",
    ADD CONSTRAINT "Sale_eventId_fkey" 
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sale -> User
ALTER TABLE "Sale" 
    DROP CONSTRAINT IF EXISTS "Sale_userId_fkey",
    ADD CONSTRAINT "Sale_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ticket -> Sale
ALTER TABLE "Ticket" 
    DROP CONSTRAINT IF EXISTS "Ticket_saleId_fkey",
    ADD CONSTRAINT "Ticket_saleId_fkey" 
    FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ticket -> TicketType
ALTER TABLE "Ticket" 
    DROP CONSTRAINT IF EXISTS "Ticket_ticketTypeId_fkey",
    ADD CONSTRAINT "Ticket_ticketTypeId_fkey" 
    FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TicketScan -> Ticket
ALTER TABLE "TicketScan" 
    DROP CONSTRAINT IF EXISTS "TicketScan_ticketId_fkey",
    ADD CONSTRAINT "TicketScan_ticketId_fkey" 
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TicketScan -> User
ALTER TABLE "TicketScan" 
    DROP CONSTRAINT IF EXISTS "TicketScan_scannedBy_fkey",
    ADD CONSTRAINT "TicketScan_scannedBy_fkey" 
    FOREIGN KEY ("scannedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TicketReprint -> Ticket
ALTER TABLE "TicketReprint" 
    DROP CONSTRAINT IF EXISTS "TicketReprint_ticketId_fkey",
    ADD CONSTRAINT "TicketReprint_ticketId_fkey" 
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TicketReprint -> User
ALTER TABLE "TicketReprint" 
    DROP CONSTRAINT IF EXISTS "TicketReprint_authorizedBy_fkey",
    ADD CONSTRAINT "TicketReprint_authorizedBy_fkey" 
    FOREIGN KEY ("authorizedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AuditLog -> User
ALTER TABLE "AuditLog" 
    DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey",
    ADD CONSTRAINT "AuditLog_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- TRIGGERS PARA updatedAt
-- =====================================================

-- Función para actualizar updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updatedAt
DROP TRIGGER IF EXISTS update_user_updated_at ON "User";
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_updated_at ON "Event";
CREATE TRIGGER update_event_updated_at BEFORE UPDATE ON "Event" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickettype_updated_at ON "TicketType";
CREATE TRIGGER update_tickettype_updated_at BEFORE UPDATE ON "TicketType" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sale_updated_at ON "Sale";
CREATE TRIGGER update_sale_updated_at BEFORE UPDATE ON "Sale" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_updated_at ON "Ticket";
CREATE TRIGGER update_ticket_updated_at BEFORE UPDATE ON "Ticket" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_systemconfig_updated_at ON "SystemConfig";
CREATE TRIGGER update_systemconfig_updated_at BEFORE UPDATE ON "SystemConfig" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- 
-- Después de ejecutar este script:
-- 1. Verifica que todas las tablas se crearon: SELECT * FROM information_schema.tables WHERE table_schema = 'public';
-- 2. Ejecuta en el servidor: npm run db:push (para sincronizar con Prisma)
-- 3. Ejecuta: npm run db:generate (para generar el cliente Prisma)
-- =====================================================
