# Propuesta: Mesas VIP con URL Personalizado y Pago por Asiento

## Resumen

Implementar un sistema donde las mesas VIP puedan venderse **por asiento** en lugar de mesa completa. Cada invitado recibe un **URL único personalizado** con su nombre, paga su parte, y la mesa solo se **confirma cuando todos los asientos han sido pagados**.

---

## Cambio de Paradigma

| Actual | Propuesto |
|--------|-----------|
| Mesa de 4 = 1 pago = 4 tickets | Mesa de 10 = 10 pagos = 10 tickets |
| Se compra toda la mesa de una vez | Cada persona paga su asiento con su link |
| Sin tracking por persona | Nombre + email de cada pagador registrado |
| Mesa vendida inmediatamente | Mesa confirmada solo cuando todos pagan |

---

## Arquitectura Propuesta

### 1. Nuevos modelos en Prisma

```prisma
// Invitación a un asiento de mesa VIP (link personalizado)
model TableSlotInvite {
  id            String   @id @default(uuid())
  eventId       String
  tableNumber   Int      // Ej: Mesa 42
  seatNumber    Int      // 1, 2, 3... hasta seatsPerTable
  
  // Token único para la URL (ej: "a7f3b9c2")
  inviteToken   String   @unique
  
  // Info del invitado (quien va a pagar)
  invitedName   String   // "Juan Pérez"
  invitedEmail  String?
  invitedPhone  String?
  
  // Estado
  status        SlotInviteStatus @default(PENDING)
  saleId        String?  // Sale cuando paga exitosamente
  
  // Precio por asiento (precio mesa / seatsPerTable)
  pricePerSeat  Decimal  @db.Decimal(10, 2)
  
  expiresAt     DateTime? // Opcional: vence en X días si no paga
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  event         Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  sale          Sale?    @relation(fields: [saleId], references: [id])

  @@index([eventId])
  @@index([inviteToken])
  @@index([eventId, tableNumber])
}

enum SlotInviteStatus {
  PENDING    // Link creado, pendiente de pago
  PAID       // Pagado exitosamente
  EXPIRED    // Venció sin pagar
  CANCELLED  // Cancelado por anfitrión
}
```

### 2. URL Personalizado

**Formato:**
```
https://tu-dominio.com/eventos/{eventId}/mesa/{tableNumber}/pagar/{inviteToken}?nombre=Juan+Perez
```

**Ejemplo:**
```
https://somnus.com/eventos/abc123/mesa/42/pagar/x7k2m9p4?nombre=Maria+Garcia
```

- **inviteToken**: UUID corto o hash único (8-12 caracteres)
- **nombre**: Opcional en query, puede venir del formulario al crear el link
- Si el nombre está en la BD (`invitedName`), el link puede mostrarlo directamente

### 3. Flujo Completo

#### Paso 1: Anfitrión reserva mesa y genera links

1. Usuario selecciona Mesa 42 (ej: 10 personas)
2. Ingresa su nombre + email
3. Opción A: Paga él todo → mesa vendida (flujo actual)
4. **Opción B (nuevo)**: "Compartir mesa con mi grupo"
   - Ingresa lista de invitados (nombres, emails) O número de asientos
   - Sistema crea N `TableSlotInvite` (N = 10)
   - Cada invitado recibe su link único (por WhatsApp, email, etc.)
   - Mesa pasa a status `reserved` (reservada, no vendida aún)

#### Paso 2: Cada invitado paga con su link

1. Invitado abre: `/eventos/abc/mesa/42/pagar/x7k2m9p4`
2. Ve: "Mesa 42 - Asiento 3 - Paga $250 (Juan Pérez)"
3. Completa datos si faltan (email, teléfono)
4. Paga con Clip
5. Al pago exitoso:
   - Se crea `Sale` + `Ticket` (1 ticket = 1 asiento)
   - `TableSlotInvite` pasa a `status: PAID`, `saleId` asignado

#### Paso 3: Confirmación de mesa

- Backend verifica: ¿Todos los slots de Mesa 42 están en `PAID`?
- Si sí → Mesa pasa a `sold` definitivamente
- Se envían boletos a cada pagador

---

## Consideraciones Importantes

### Mesa de 10 vs mesa de 4

- `TicketType.seatsPerTable` puede ser 4, 6, 10, etc.
- El modelo `TableSlotInvite` es genérico: `seatNumber` va de 1 a `seatsPerTable`

### Precio por asiento

```
precioPorAsiento = precioMesaTotal / seatsPerTable
```

Ejemplo: Mesa $2,500 con 10 asientos → $250 por persona

### Expiración de links

- Opción: `expiresAt` = creado + 7 días (configurable)
- Si no pagan a tiempo: slot pasa a `EXPIRED`, mesa puede liberarse

### ¿Qué pasa si uno no paga?

1. **Política estricta**: Mesa reservada X días. Si no completan, se libera.
2. **Política flexible**: Anfitrión puede marcar algunos slots como "yo pago" y pagar él ese asiento.
3. **Admin**: Ver qué mesas están a medias y contactar o liberar.

### Compatibilidad con flujo actual

- Mantener la opción de comprar mesa completa (flujo actual)
- Añadir botón "Compartir mesa / Invitar grupo" que activa el flujo de links

---

## Endpoints a Crear

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/events/[id]/tables/[tableNumber]/invites` | Crear N invitaciones para una mesa |
| GET | `/api/invites/[token]` | Obtener datos del link (evento, mesa, asiento, precio, nombre) |
| POST | `/api/checkout/invite` | Crear Sale desde un TableSlotInvite (en vez de carrito) |
| GET | `/api/events/[id]/tables/[tableNumber]/invites/status` | Ver cuántos han pagado de la mesa |

---

## Páginas a Crear

| Ruta | Descripción |
|------|-------------|
| `/eventos/[id]/mesa/[tableNumber]/invitar` | Formulario para crear links (anfitrión) |
| `/eventos/[id]/mesa/[tableNumber]/pagar/[token]` | Checkout personalizado para el invitado |

---

## Esquema Visual del Flujo

```
[Anfitrión selecciona Mesa 42 - 10 personas]
         |
         v
[Formulario: "Invitar grupo" - Ingresa nombres/emails]
         |
         v
[Sistema crea 10 TableSlotInvite]
         |
         v
[Genera 10 links - envía por WhatsApp/email]
         |
    ---> [Invitado 1] --> Paga $250 --> Sale + Ticket --> Slot 1 = PAID
    ---> [Invitado 2] --> Paga $250 --> Sale + Ticket --> Slot 2 = PAID
    ...
    ---> [Invitado 10] --> Paga $250 --> Sale + Ticket --> Slot 10 = PAID
         |
         v
[Todos PAID] --> Mesa 42 = SOLD --> Boletos enviados
```

---

## Orden de Implementación Sugerido

1. **Fase 1 - Schema y migración**
   - Añadir `TableSlotInvite` y enum `SlotInviteStatus` a Prisma
   - Añadir relación `Sale.tableSlotInviteId` (opcional, para trazabilidad)
   - Migrar BD

2. **Fase 2 - API de invites**
   - POST crear invites
   - GET invite por token

3. **Fase 3 - Página de checkout por invite**
   - Ruta `/eventos/[id]/mesa/[tableNumber]/pagar/[token]`
   - Formulario con datos pre-llenados (nombre del invite)
   - Llamada a checkout especial que usa `TableSlotInvite` en vez de carrito

4. **Fase 4 - Integración con create-charge**
   - Modificar create-charge para crear 1 ticket (no N) cuando viene de invite
   - Actualizar `TableSlotInvite` a PAID
   - Verificar si mesa completa → marcar sold

5. **Fase 5 - UI de "Invitar grupo"**
   - Modal o página para crear invites
   - Generar links descargables / copiables
   - Opción de enviar por email (si tienes servicio de email)

6. **Fase 6 - Estado de mesas**
   - Modificar API `/api/events/[id]/tables` para:
     - Mesa con invites pendientes → status `reserved` (parcial)
     - Mesa con todos pagados → status `sold`

---

## Resumen de Archivos a Modificar/Crear

| Archivo | Acción |
|---------|--------|
| `prisma/schema.prisma` | Añadir TableSlotInvite, SlotInviteStatus |
| `app/api/events/[id]/tables/[tableNumber]/invites/route.ts` | Nuevo - CRUD invites |
| `app/api/invites/[token]/route.ts` | Nuevo - GET invite por token |
| `app/api/checkout/invite/route.ts` | Nuevo - Checkout desde invite |
| `app/eventos/[id]/mesa/[tableNumber]/pagar/[token]/page.tsx` | Nuevo - Página de pago |
| `app/eventos/[id]/mesa/[tableNumber]/invitar/page.tsx` | Nuevo - Crear invites |
| `app/api/events/[id]/tables/route.ts` | Modificar - Considerar invites en status |
| `app/api/payments/clip/create-charge/route.ts` | Modificar - Soporte para Sale desde invite |
| `app/eventos/[id]/mesas/page.tsx` | Modificar - Botón "Invitar grupo" en mesas |

---

¿Quieres que comience con la Fase 1 (schema + migración) o prefieres ajustar primero algún detalle de la propuesta?
