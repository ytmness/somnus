-- =====================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) EN SUPABASE
-- =====================================================
-- NOTA: Si usas Prisma directamente (no la API REST de Supabase),
-- RLS puede no ser necesario, pero es buena práctica de seguridad.

-- Habilitar RLS en todas las tablas
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketScan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketReprint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS BÁSICAS (PERMITIR TODO POR AHORA)
-- =====================================================
-- Estas políticas permiten acceso completo. Ajusta según tus necesidades.

-- Event: Permitir lectura pública, escritura solo para autenticados
CREATE POLICY "Events are viewable by everyone" ON "Event"
  FOR SELECT USING (true);

CREATE POLICY "Events are insertable by authenticated users" ON "Event"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Events are updatable by authenticated users" ON "Event"
  FOR UPDATE USING (true);

-- TicketType: Permitir lectura pública, escritura solo para autenticados
CREATE POLICY "TicketTypes are viewable by everyone" ON "TicketType"
  FOR SELECT USING (true);

CREATE POLICY "TicketTypes are insertable by authenticated users" ON "TicketType"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "TicketTypes are updatable by authenticated users" ON "TicketType"
  FOR UPDATE USING (true);

-- Sale: Solo usuarios autenticados pueden ver/crear sus propias ventas
CREATE POLICY "Sales are viewable by authenticated users" ON "Sale"
  FOR SELECT USING (true);

CREATE POLICY "Sales are insertable by authenticated users" ON "Sale"
  FOR INSERT WITH CHECK (true);

-- Ticket: Lectura pública para validación, escritura solo autenticados
CREATE POLICY "Tickets are viewable by everyone" ON "Ticket"
  FOR SELECT USING (true);

CREATE POLICY "Tickets are insertable by authenticated users" ON "Ticket"
  FOR INSERT WITH CHECK (true);

-- TicketScan: Solo usuarios con rol ACCESOS o ADMIN
CREATE POLICY "TicketScans are viewable by authenticated users" ON "TicketScan"
  FOR SELECT USING (true);

CREATE POLICY "TicketScans are insertable by authenticated users" ON "TicketScan"
  FOR INSERT WITH CHECK (true);

-- TicketReprint: Solo usuarios autenticados
CREATE POLICY "TicketReprints are viewable by authenticated users" ON "TicketReprint"
  FOR SELECT USING (true);

CREATE POLICY "TicketReprints are insertable by authenticated users" ON "TicketReprint"
  FOR INSERT WITH CHECK (true);

-- SystemConfig: Solo admins
CREATE POLICY "SystemConfig is viewable by authenticated users" ON "SystemConfig"
  FOR SELECT USING (true);

CREATE POLICY "SystemConfig is updatable by authenticated users" ON "SystemConfig"
  FOR UPDATE USING (true);

-- AuditLog: Solo admins
CREATE POLICY "AuditLogs are viewable by authenticated users" ON "AuditLog"
  FOR SELECT USING (true);

CREATE POLICY "AuditLogs are insertable by authenticated users" ON "AuditLog"
  FOR INSERT WITH CHECK (true);

-- User: Solo el mismo usuario o admins
CREATE POLICY "Users can view their own profile" ON "User"
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON "User"
  FOR UPDATE USING (true);

-- =====================================================
-- NOTA IMPORTANTE:
-- =====================================================
-- Si usas Prisma directamente (no la API REST de Supabase),
-- puedes NO ejecutar este script. RLS solo afecta las consultas
-- a través de la API REST de Supabase.
-- 
-- Si usas la API REST de Supabase, SÍ debes habilitar RLS y
-- ajustar las políticas según tus necesidades de seguridad.
