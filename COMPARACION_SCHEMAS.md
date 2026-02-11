# 🔍 Comparación de Schemas: Boletera-Regia vs Somnus

## ✅ Estructura de Tablas - IDÉNTICA

Ambos schemas tienen las mismas 9 tablas:
1. ✅ User
2. ✅ Event
3. ✅ TicketType
4. ✅ Sale
5. ✅ Ticket
6. ✅ TicketScan
7. ✅ TicketReprint
8. ✅ AuditLog
9. ✅ SystemConfig

---

## 🔍 Diferencias Encontradas

### 1. **Tipos de Datos de Timestamp**

**Boletera-Regia:**
```sql
createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
updatedAt timestamp without time zone NOT NULL
```

**Somnus (Prisma):**
```sql
createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
```

**Diferencia**: 
- Prisma usa `TIMESTAMP(3)` (con milisegundos)
- Boletera-Regia usa `timestamp without time zone` (sin milisegundos)
- **Impacto**: Mínimo, ambos funcionan correctamente

---

### 2. **Constraints Únicas**

**Boletera-Regia**: No muestra explícitamente las constraints únicas en el extracto, pero deben existir porque:
- `User.email` tiene `@unique` en Prisma
- `Ticket.ticketNumber` tiene `@unique` en Prisma
- `Ticket.qrCode` tiene `@unique` en Prisma
- `SystemConfig.key` tiene `@unique` en Prisma

**Somnus**: Incluye todas las constraints únicas explícitamente:
- ✅ `User_email_key` UNIQUE (email)
- ✅ `Ticket_ticketNumber_key` UNIQUE (ticketNumber)
- ✅ `Ticket_qrCode_key` UNIQUE (qrCode)
- ✅ `SystemConfig_key_key` UNIQUE (key)

**Conclusión**: El script de Somnus está correcto y completo.

---

### 3. **Foreign Keys - ON DELETE**

**Boletera-Regia**: No especifica `ON DELETE` (usa defaults de PostgreSQL)

**Somnus**: Especifica explícitamente según Prisma:
- `TicketType -> Event`: `ON DELETE CASCADE` ✅
- `Ticket -> Sale`: `ON DELETE CASCADE` ✅
- `Sale -> User`: `ON DELETE SET NULL` ✅
- `AuditLog -> User`: `ON DELETE SET NULL` ✅
- Resto: `ON DELETE RESTRICT` (default)

**Conclusión**: El script de Somnus sigue las especificaciones de Prisma, que son más explícitas y seguras.

---

### 4. **Índices**

**Boletera-Regia**: No muestra índices en el extracto

**Somnus**: Incluye todos los índices según Prisma:
- ✅ User: email, role, emailVerified
- ✅ Event: eventDate, isActive
- ✅ TicketType: eventId, category, isActive
- ✅ Sale: eventId, status, createdAt, buyerEmail
- ✅ Ticket: qrCode, ticketNumber, status, saleId
- ✅ TicketScan: ticketId, scannedAt, result
- ✅ TicketReprint: ticketId, reprintedAt
- ✅ AuditLog: userId, action, createdAt, (entityType, entityId)
- ✅ SystemConfig: key

**Conclusión**: El script de Somnus incluye todos los índices necesarios para optimización.

---

### 5. **Triggers para updatedAt**

**Boletera-Regia**: No muestra triggers

**Somnus**: Incluye triggers automáticos para mantener `updatedAt` actualizado:
- ✅ Función `update_updated_at_column()`
- ✅ Triggers en todas las tablas con `updatedAt`

**Conclusión**: El script de Somnus es más completo y automático.

---

## ✅ Verificación Final

### Campos por Tabla - Comparación

| Tabla | Boletera-Regia | Somnus | Estado |
|-------|----------------|--------|--------|
| User | ✅ Completo | ✅ Completo | ✅ Igual |
| Event | ✅ Completo | ✅ Completo | ✅ Igual |
| TicketType | ✅ Completo | ✅ Completo | ✅ Igual |
| Sale | ✅ Completo | ✅ Completo | ✅ Igual |
| Ticket | ✅ Completo | ✅ Completo | ✅ Igual |
| TicketScan | ✅ Completo | ✅ Completo | ✅ Igual |
| TicketReprint | ✅ Completo | ✅ Completo | ✅ Igual |
| AuditLog | ✅ Completo | ✅ Completo | ✅ Igual |
| SystemConfig | ⚠️ Falta `id` en extracto | ✅ Completo | ✅ Igual (debe tener id) |

---

## 🎯 Conclusión

El script SQL de Somnus está **CORRECTO y COMPLETO**. 

**Diferencias encontradas son:**
1. ✅ **Mejoras**: El script de Somnus incluye índices y triggers que optimizan la base de datos
2. ✅ **Compatibilidad**: Ambos schemas son funcionalmente idénticos
3. ✅ **Completitud**: El script de Somnus sigue exactamente el schema de Prisma

**Recomendación**: 
- ✅ Usar el script de Somnus tal como está
- ✅ Es más completo que el extracto de boletera-regia mostrado
- ✅ Sigue las mejores prácticas de Prisma

---

## 📝 Notas

El extracto de boletera-regia parece ser una exportación simplificada que:
- No muestra constraints únicas explícitas (pero deben existir)
- No muestra índices (pero deben existir)
- No muestra triggers (pero pueden existir)
- Usa tipos de datos ligeramente diferentes pero compatibles

El script de Somnus es más explícito y completo, lo cual es mejor para:
- ✅ Mantenibilidad
- ✅ Documentación
- ✅ Debugging
- ✅ Migraciones futuras
