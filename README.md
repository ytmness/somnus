# Somnus — Plataforma de boletos

Sistema completo de venta y gestión de boletos para eventos en vivo, desarrollado para **Somnus**.

## 📋 Características Principales

### ✅ FASE 1 - COMPLETADA
- ✅ Arquitectura Next.js 14 con App Router
- ✅ Base de datos PostgreSQL con Prisma ORM
- ✅ Integración con Supabase
- ✅ Sistema de roles (Admin, Vendedor, Supervisor, Accesos)
- ✅ Gestión de inventario en tiempo real
- ✅ Generación de QR únicos por boleto
- ✅ Generación de PDFs formato A6

### 🚧 FASE 2 - En Desarrollo
- Flujo de venta online completo
- Integración con pasarela de pago
- Envío de boletos por email
- Sistema de reimpresión controlada

### 📅 FASE 3 - Planeada
- Panel de administración completo
- Dashboard con métricas en tiempo real
- Punto de venta físico (POS)
- Sistema de reportes

### 📅 FASE 4 - Planeada
- PWA para escaneo de boletos
- Sistema de accesos con validación QR
- Control de pulseras por zona
- Reportes post-evento

---

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utility-first
- **shadcn/ui** - Componentes UI
- **TanStack Query** - State management del servidor
- **Zustand** - State management del cliente

### Backend
- **Next.js API Routes** - Backend serverless
- **Prisma** - ORM con type-safety
- **PostgreSQL** - Base de datos (via Supabase)
- **Supabase** - Auth, Storage, Realtime

### Servicios
- **jsPDF** - Generación de boletos PDF
- **qrcode** - Generación de códigos QR
- **Sonner** - Notificaciones toast

---

## 📦 Instalación

### 1. Clonar el repositorio
\`\`\`bash
git clone <tu-repo>
cd boletera-regia-v2
\`\`\`

### 2. Instalar dependencias
\`\`\`bash
npm install
\`\`\`

### 3. Configurar variables de entorno

Copia el archivo \`.env.example\` a \`.env.local\`:

\`\`\`bash
cp .env.example .env.local
\`\`\`

### 4. Configurar Supabase

1. Crea un proyecto en [https://supabase.com](https://supabase.com)
2. Ve a **Settings > API** y copia:
   - Project URL → \`NEXT_PUBLIC_SUPABASE_URL\`
   - anon/public key → \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`
   - service_role key → \`SUPABASE_SERVICE_ROLE_KEY\`

3. Ve a **Settings > Database** y copia la connection string:
   - Reemplaza \`[YOUR-PASSWORD]\` con tu contraseña
   - Usa el formato: \`postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres\`

### 5. Ejecutar migraciones de Prisma

\`\`\`bash
# Generar cliente de Prisma
npm run db:generate

# Aplicar schema a la base de datos
npm run db:push
\`\`\`

### 6. Iniciar servidor de desarrollo

\`\`\`bash
npm run dev
\`\`\`

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

---

## 📂 Estructura del Proyecto

\`\`\`
boletera-regia-v2/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Autenticación
│   │   ├── events/               # Gestión de eventos
│   │   ├── sales/                # Ventas
│   │   ├── tickets/              # Boletos
│   │   └── inventory/            # Inventario
│   ├── login/                    # Página de login
│   ├── admin/                    # Dashboard Admin
│   ├── vendedor/                 # Dashboard Vendedor
│   ├── supervisor/               # Dashboard Supervisor
│   ├── accesos/                  # App de escaneo
│   ├── eventos/                  # Listado de eventos
│   ├── layout.tsx                # Layout principal
│   ├── page.tsx                  # Homepage
│   ├── providers.tsx             # Providers (React Query, etc)
│   └── globals.css               # Estilos globales
│
├── components/                   # Componentes React
│   ├── ui/                       # Componentes UI base (shadcn)
│   ├── shared/                   # Componentes compartidos
│   ├── dashboard/                # Componentes de dashboards
│   └── eventos/                  # Componentes de eventos
│
├── lib/                          # Librerías y utilidades
│   ├── db/                       # Configuración de DB
│   │   ├── prisma.ts             # Cliente Prisma
│   │   └── supabase.ts           # Cliente Supabase
│   ├── services/                 # Lógica de negocio
│   │   ├── qr-generator.ts       # Generación de QR
│   │   ├── ticket-generator.ts   # Generación de PDFs
│   │   └── inventory.ts          # Gestión de inventario
│   ├── utils/                    # Utilidades generales
│   │   └── index.ts              # Helpers (cn, formatters, etc)
│   └── validations/              # Validaciones con Zod
│
├── types/                        # Definiciones TypeScript
│   └── index.ts                  # Tipos del sistema
│
├── prisma/                       # Prisma ORM
│   └── schema.prisma             # Schema de la base de datos
│
├── public/                       # Archivos estáticos
│   ├── assets/                   # Assets generales
│   └── images/                   # Imágenes
│
├── .env.example                  # Ejemplo de variables de entorno
├── .env.local                    # Variables de entorno (no commitear)
├── next.config.ts                # Configuración Next.js
├── tailwind.config.ts            # Configuración Tailwind
├── tsconfig.json                 # Configuración TypeScript
└── package.json                  # Dependencias
\`\`\`

---

## 🗄️ Modelo de Base de Datos

### Entidades Principales

#### **Users** - Usuarios del sistema
- Roles: ADMIN, VENDEDOR, SUPERVISOR, ACCESOS
- Gestión de permisos por rol

#### **Events** - Eventos
- Información completa del evento
- Fechas de venta y evento
- Capacidad máxima (aforo)

#### **TicketTypes** - Tipos de boleto
- GENERAL, PREFERENTE, VIP
- Precios y cantidades por tipo
- Soporte para mesas VIP (4 boletos por mesa)

#### **Sales** - Ventas/Transacciones
- Canales: ONLINE, POS
- Estados: PENDING, COMPLETED, CANCELLED, REFUNDED
- Información del comprador

#### **Tickets** - Boletos individuales
- QR único e irrepetible
- Número de folio
- PDF generado
- Control de uso

#### **TicketScans** - Escaneos/Accesos
- Registro de cada escaneo
- Validación de duplicados
- Trazabilidad completa

#### **AuditLog** - Auditoría
- Registro de todas las acciones
- Cambios en inventario, precios, etc.

---

## 🔐 Sistema de Roles

### ADMIN
- Control total del sistema
- Gestión de eventos, inventario y precios
- Autorización de reimpresiones
- Acceso a todos los reportes

### VENDEDOR
- Venta de boletos (POS)
- Impresión de boletos
- NO puede editar precios ni inventario

### SUPERVISOR
- Visualización de reportes
- Cortes de caja
- NO puede vender

### ACCESOS
- Solo escaneo de boletos
- Validación de QR
- Registro de accesos

---

## 🎨 Diseño de Boletos

### Formato
- **A6 Horizontal** (148mm x 105mm)
- **Una sola cara**
- **Impresión láser**

### Contenido
- Logo Somnus
- Información del evento (artista, venue, fecha, hora)
- Zona del boleto
- QR prominente (55x55mm)
- Folio único
- Datos del comprador
- Sellos oficiales

### Colores Brand
- **Azul Somnus**: #5B8DEF
- **Negro Regia**: #2a2c30
- **Gris Regia**: #49484e
- **Crema**: #f9fbf6

---

## 🚀 Scripts Disponibles

\`\`\`bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Producción
npm run build            # Build para producción
npm run start            # Inicia servidor de producción

# Base de datos
npm run db:generate      # Genera cliente Prisma
npm run db:push          # Aplica schema a DB
npm run db:studio        # Abre Prisma Studio (GUI)

# Linting
npm run lint             # Ejecuta ESLint
\`\`\`

---

## 📝 Siguientes Pasos

### Implementar AHORA (FASE 2)
1. ✅ API de creación de eventos
2. ✅ API de venta de boletos
3. ✅ Generación automática de PDFs
4. ⏳ Integración de pasarela de pago
5. ⏳ Sistema de envío de emails

### Proximamente (FASE 3)
- Dashboards completos por rol
- Punto de venta físico (POS)
- Sistema de reportes avanzados
- Gestión de cortesías

### Futuro (FASE 4)
- PWA de escaneo móvil
- Sistema de accesos completo
- Sincronización offline
- Reportes post-evento

---

## 📄 Licencia

Propietario: **Somnus**  
Todos los derechos reservados.

---

## 👨‍💻 Equipo de Desarrollo

Desarrollado para **Somnus**  
Sistema de boletería premium para eventos en vivo.

---

## 📞 Soporte

Para dudas o soporte técnico, contactar al equipo de desarrollo.

