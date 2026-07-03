-- =====================================================
-- Script SQL para crear el schema completo de Somnus
-- Base de datos: rbcqxxbddvbomwarmjvd.supabase.co
-- =====================================================

-- Crear ENUMs primero
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VENDEDOR', 'SUPERVISOR', 'ACCESOS', 'CLIENTE');
CREATE TYPE "TicketCategory" AS ENUM ('GENERAL', 'PREFERENTE', 'VIP');
CREATE TYPE "SaleChannel" AS ENUM ('ONLINE', 'POS');
CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'USED', 'CANCELLED', 'REPRINTED');
CREATE TYPE "ScanResult" AS ENUM ('SUCCESS', 'ALREADY_USED', 'INVALID', 'CANCELLED', 'EVENT_MISMATCH');
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

-- =====================================================
-- TABLA: User
-- =====================================================
CREATE TABLE "User" (
  id text NOT NULL,
  email text NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  role "UserRole" NOT NULL DEFAULT 'VENDEDOR',
  "isActive" boolean NOT NULL DEFAULT true,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "verificationCode" text,
  "verificationCodeExpires" timestamp without time zone,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY (id),
  CONSTRAINT "User_email_key" UNIQUE (email)
);

-- Índices para User
CREATE INDEX "User_email_idx" ON "User"(email);
CREATE INDEX "User_role_idx" ON "User"(role);
CREATE INDEX "User_emailVerified_idx" ON "User"("emailVerified");

-- =====================================================
-- TABLA: Event
-- =====================================================
CREATE TABLE "Event" (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  artist text NOT NULL,
  tour text,
  venue text NOT NULL,
  address text,
  "eventDate" timestamp without time zone NOT NULL,
  "eventTime" text NOT NULL,
  "imageUrl" text,
  "maxCapacity" integer NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "salesStartDate" timestamp without time zone NOT NULL,
  "salesEndDate" timestamp without time zone NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Event_pkey" PRIMARY KEY (id)
);

-- Índices para Event
CREATE INDEX "Event_eventDate_idx" ON "Event"("eventDate");
CREATE INDEX "Event_isActive_idx" ON "Event"("isActive");

-- =====================================================
-- TABLA: TicketType
-- =====================================================
CREATE TABLE "TicketType" (
  id text NOT NULL,
  "eventId" text NOT NULL,
  name text NOT NULL,
  description text,
  category "TicketCategory" NOT NULL,
  price numeric(10, 2) NOT NULL,
  "maxQuantity" integer NOT NULL,
  "soldQuantity" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "isTable" boolean NOT NULL DEFAULT false,
  "seatsPerTable" integer,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketType_pkey" PRIMARY KEY (id),
  CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE CASCADE
);

-- Índices para TicketType
CREATE INDEX "TicketType_eventId_idx" ON "TicketType"("eventId");
CREATE INDEX "TicketType_category_idx" ON "TicketType"(category);
CREATE INDEX "TicketType_isActive_idx" ON "TicketType"("isActive");

-- =====================================================
-- TABLA: Sale
-- =====================================================
CREATE TABLE "Sale" (
  id text NOT NULL,
  "eventId" text NOT NULL,
  "userId" text,
  channel "SaleChannel" NOT NULL,
  status "SaleStatus" NOT NULL DEFAULT 'PENDING',
  subtotal numeric(10, 2) NOT NULL,
  tax numeric(10, 2) NOT NULL,
  total numeric(10, 2) NOT NULL,
  "buyerName" text NOT NULL,
  "buyerEmail" text NOT NULL,
  "buyerPhone" text,
  "paymentMethod" text,
  "paymentId" text,
  "paidAt" timestamp without time zone,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sale_pkey" PRIMARY KEY (id),
  CONSTRAINT "Sale_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"(id),
  CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id)
);

-- Índices para Sale
CREATE INDEX "Sale_eventId_idx" ON "Sale"("eventId");
CREATE INDEX "Sale_status_idx" ON "Sale"(status);
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");
CREATE INDEX "Sale_buyerEmail_idx" ON "Sale"("buyerEmail");

-- =====================================================
-- TABLA: Ticket
-- =====================================================
CREATE TABLE "Ticket" (
  id text NOT NULL,
  "saleId" text NOT NULL,
  "ticketTypeId" text NOT NULL,
  "ticketNumber" text NOT NULL,
  "qrCode" text NOT NULL,
  status "TicketStatus" NOT NULL DEFAULT 'VALID',
  "tableNumber" text,
  "seatNumber" integer,
  "pdfUrl" text,
  "scannedAt" timestamp without time zone,
  "scannedBy" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY (id),
  CONSTRAINT "Ticket_ticketNumber_key" UNIQUE ("ticketNumber"),
  CONSTRAINT "Ticket_qrCode_key" UNIQUE ("qrCode"),
  CONSTRAINT "Ticket_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"(id) ON DELETE CASCADE,
  CONSTRAINT "Ticket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"(id)
);

-- Índices para Ticket
CREATE INDEX "Ticket_qrCode_idx" ON "Ticket"("qrCode");
CREATE INDEX "Ticket_ticketNumber_idx" ON "Ticket"("ticketNumber");
CREATE INDEX "Ticket_status_idx" ON "Ticket"(status);
CREATE INDEX "Ticket_saleId_idx" ON "Ticket"("saleId");

-- =====================================================
-- TABLA: TicketScan
-- =====================================================
CREATE TABLE "TicketScan" (
  id text NOT NULL,
  "ticketId" text NOT NULL,
  "scannedBy" text NOT NULL,
  result "ScanResult" NOT NULL,
  notes text,
  "scannedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deviceInfo" text,
  location text,
  CONSTRAINT "TicketScan_pkey" PRIMARY KEY (id),
  CONSTRAINT "TicketScan_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"(id),
  CONSTRAINT "TicketScan_scannedBy_fkey" FOREIGN KEY ("scannedBy") REFERENCES "User"(id)
);

-- Índices para TicketScan
CREATE INDEX "TicketScan_ticketId_idx" ON "TicketScan"("ticketId");
CREATE INDEX "TicketScan_scannedAt_idx" ON "TicketScan"("scannedAt");
CREATE INDEX "TicketScan_result_idx" ON "TicketScan"(result);

-- =====================================================
-- TABLA: TicketReprint
-- =====================================================
CREATE TABLE "TicketReprint" (
  id text NOT NULL,
  "ticketId" text NOT NULL,
  "authorizedBy" text NOT NULL,
  reason text NOT NULL,
  "reprintedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketReprint_pkey" PRIMARY KEY (id),
  CONSTRAINT "TicketReprint_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"(id),
  CONSTRAINT "TicketReprint_authorizedBy_fkey" FOREIGN KEY ("authorizedBy") REFERENCES "User"(id)
);

-- Índices para TicketReprint
CREATE INDEX "TicketReprint_ticketId_idx" ON "TicketReprint"("ticketId");
CREATE INDEX "TicketReprint_reprintedAt_idx" ON "TicketReprint"("reprintedAt");

-- =====================================================
-- TABLA: AuditLog
-- =====================================================
CREATE TABLE "AuditLog" (
  id text NOT NULL,
  "userId" text,
  action "AuditAction" NOT NULL,
  "entityType" text NOT NULL,
  "entityId" text NOT NULL,
  changes jsonb,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id),
  CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id)
);

-- Índices para AuditLog
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"(action);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- =====================================================
-- TABLA: SystemConfig
-- =====================================================
CREATE TABLE "SystemConfig" (
  id text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  description text,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemConfig_pkey" PRIMARY KEY (id),
  CONSTRAINT "SystemConfig_key_key" UNIQUE (key)
);

-- Índice para SystemConfig
CREATE INDEX "SystemConfig_key_idx" ON "SystemConfig"(key);

-- =====================================================
-- Función para actualizar updatedAt automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updatedAt
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_updated_at BEFORE UPDATE ON "Event"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickettype_updated_at BEFORE UPDATE ON "TicketType"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_updated_at BEFORE UPDATE ON "Sale"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_updated_at BEFORE UPDATE ON "Ticket"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_systemconfig_updated_at BEFORE UPDATE ON "SystemConfig"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Datos iniciales (usuarios admin y vendedor)
-- =====================================================
-- Nota: Las contraseñas deben ser hasheadas con bcrypt
-- Ejemplo: contraseña "admin123" hasheada
-- INSERT INTO "User" (id, email, password, name, role, "isActive", "emailVerified")
-- VALUES 
--   ('admin-id', 'admin@somnus.com', '$2b$10$hashed_password_here', 'Admin Somnus', 'ADMIN', true, true),
--   ('vendedor-id', 'vendedor@somnus.com', '$2b$10$hashed_password_here', 'Vendedor Somnus', 'VENDEDOR', true, true);
