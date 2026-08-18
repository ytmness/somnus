# Prisma y SQL en Supabase

## ¿Para qué se usa Prisma?

Prisma es el **ORM** (Object-Relational Mapping) que usa la app para hablar con la base de datos PostgreSQL de Supabase. Las rutas API y el backend usan Prisma para:

- `prisma.user.findUnique()` – buscar usuarios
- `prisma.event.create()` – crear eventos
- `prisma.sale.create()` – registrar ventas
- etc.

**Sin Prisma tendrías que escribir SQL a mano** en cada ruta (con `pg` o el cliente de Supabase).

---

## ¿Puedo seguir usando el SQL Editor de Supabase?

**Sí.** Los datos que creas o modificas desde el SQL Editor de Supabase son los mismos que ve Prisma. Ambos usan la misma base de datos.

---

## Cambios de schema hechos con SQL

Si cambias tablas o columnas desde el SQL Editor:

1. **Opción A – Sincronizar Prisma con la DB:**
   ```bash
   npx prisma db pull
   ```
   Actualiza el `schema.prisma` según el estado actual de la base de datos.

2. **Opción B – Mantener Prisma como fuente:**
   Edita `prisma/schema.prisma` y luego:
   ```bash
   npx prisma db push
   ```
   Así se aplican tus cambios de Prisma a la base de datos.

---

## Resumen

| Tú haces | Prisma |
|----------|--------|
| Consultas y cambios rápidos en SQL Editor | Lectura/escritura desde el código de la app |
| Migraciones o scripts complejos | Operaciones CRUD en las rutas API |

Puedes usar ambos: SQL para administración y Prisma para la lógica de la app.
