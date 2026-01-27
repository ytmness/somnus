# 🚀 Comandos para Servidor Somnus

## 📋 Configuración Inicial

```bash
# 1. Conectar al servidor
ssh root@144.202.72.150

# 2. Ir al directorio
cd /var/www/somnus

# 3. Editar .env (usar configuración de ENV_SERVIDOR_POOLER.md)
nano .env
```

---

## 🔧 Instalación y Setup

```bash
# Instalar dependencias (usar --legacy-peer-deps para resolver conflictos de ESLint)
npm install --legacy-peer-deps

# Aplicar schema de Prisma a la base de datos
npm run db:push

# Generar cliente Prisma
npm run db:generate

# Build de producción
npm run build
```

---

## 🔄 Comandos de Actualización (Metodología del Servidor)

```bash
# Ir al directorio
cd /var/www/somnus

# Actualizar código desde GitHub
git pull origin main

# Limpiar build anterior
rm -rf .next

# Rebuild
npm run build

# Reiniciar aplicación
pm2 restart somnus

# Ver logs (opcional)
pm2 logs somnus
```

---

## 🐛 Troubleshooting

### Error: "Can't reach database server"
- Verifica que `DATABASE_URL` use el Session Pooler
- Formato correcto: `postgres://postgres.rbcqxxbddvbomwarmjvd:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

### Error: "Tenant or user not found"
- Verifica que el usuario incluya el project ref: `postgres.rbcqxxbddvbomwarmjvd`
- No uses solo `postgres` como usuario

### Error: ESLint dependency conflict
- Usa `npm install --legacy-peer-deps` en lugar de `npm install`

### Error: Prisma db:push falla
- Prueba cambiar `DIRECT_URL` a Transaction Mode (puerto 6543)
- O usa el Session Pooler también para `DIRECT_URL`

---

## 📊 PM2 Comandos Útiles

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs en tiempo real
pm2 logs somnus

# Ver logs de errores
pm2 logs somnus --err

# Reiniciar aplicación
pm2 restart somnus

# Detener aplicación
pm2 stop somnus

# Iniciar aplicación
pm2 start somnus

# Eliminar aplicación de PM2
pm2 delete somnus
```

---

## 🔍 Verificar Configuración

```bash
# Verificar variables de entorno (sin mostrar valores sensibles)
cd /var/www/somnus
cat .env | grep -E "SUPABASE|DATABASE" | sed 's/=.*/=***/'

# Verificar conexión a base de datos
npm run db:push

# Verificar build
npm run build
```

---

## 📝 Notas Importantes

1. **Siempre usar `--legacy-peer-deps`** al instalar dependencias
2. **DATABASE_URL debe usar Session Pooler** (no conexión directa)
3. **Usuario debe incluir project ref**: `postgres.rbcqxxbddvbomwarmjvd`
4. **Limpiar `.next` antes de rebuild** para evitar problemas de caché
5. **Verificar logs después de cada deploy** con `pm2 logs somnus`
