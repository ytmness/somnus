-- Script SQL para inicializar la base de datos Somnus
-- Ejecutar este script si la base de datos está vacía y Prisma db:push no funciona

-- NOTA: Este script es solo de referencia. 
-- Prisma debería crear automáticamente todas las tablas con: npm run db:push
-- Si necesitas ejecutar esto manualmente, hazlo desde el SQL Editor de Supabase

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Los tipos ENUM se crearán automáticamente con Prisma
-- Este script asume que Prisma ya creó los tipos ENUM

-- Si necesitas crear los ENUMs manualmente (solo si Prisma falla):
-- CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VENDEDOR', 'SUPERVISOR', 'ACCESOS', 'CLIENTE');
-- CREATE TYPE "TicketCategory" AS ENUM ('GENERAL', 'PREFERENTE', 'VIP');
-- CREATE TYPE "SaleChannel" AS ENUM ('ONLINE', 'POS');
-- CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');
-- CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'USED', 'CANCELLED', 'REPRINTED');
-- CREATE TYPE "ScanResult" AS ENUM ('SUCCESS', 'ALREADY_USED', 'INVALID', 'CANCELLED', 'EVENT_MISMATCH');
-- CREATE TYPE "AuditAction" AS ENUM (
--   'USER_LOGIN', 'USER_LOGOUT', 'SALE_CREATED', 'SALE_COMPLETED', 
--   'SALE_CANCELLED', 'TICKET_GENERATED', 'TICKET_SCANNED', 'TICKET_REPRINTED',
--   'INVENTORY_UPDATED', 'PRICE_CHANGED', 'EVENT_CREATED', 'EVENT_UPDATED', 'EVENT_DELETED'
-- );

-- IMPORTANTE: 
-- Este script NO debe ejecutarse manualmente si puedes usar Prisma.
-- Prisma maneja automáticamente la creación de tablas, índices y relaciones.
-- 
-- Usa este script SOLO si:
-- 1. Prisma db:push falla completamente
-- 2. Necesitas recrear la base de datos desde cero
-- 3. Tienes problemas de migración que no puedes resolver

-- Para ejecutar desde Supabase Dashboard:
-- 1. Ve a SQL Editor
-- 2. Pega este script
-- 3. Ejecuta solo las partes necesarias
-- 4. Luego ejecuta: npm run db:push desde el servidor
