# 🔴 Problema: Base de Datos no Conecta con PM2

## 📋 Resumen del Problema

- **Error**: `FATAL: Tenant or user not found`
- **Causa**: PM2 no está cargando correctamente las variables de entorno del archivo `.env`
- **Estado**: El `.env` está correcto, `npm run db:generate` funciona, pero la app con PM2 falla

## ✅ Lo que SABEMOS que funciona:

1. **El `.env` está correcto**:
   ```env
   DATABASE_URL=postgres://postgres.rbcqxxbddvbomwarmjvd:5S73wOjVjiSyRvFV@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   DIRECT_URL=postgres://postgres.rbcqxxbddvbomwarmjvd:5S73wOjVjiSyRvFV@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```

2. **Prisma CLI funciona**:
   ```bash
   npm run db:generate  # ✅ Funciona correctamente
   ```

3. **La conexión a la base de datos funciona** cuando se ejecuta directamente

## ❌ Lo que NO funciona:

- PM2 no está cargando el `.env` cuando inicia la aplicación Next.js
- La aplicación muestra `FATAL: Tenant or user not found` cuando intenta conectarse

## 🔧 Soluciones Intentadas:

1. ✅ Script `start.sh` con `source .env` - No funcionó completamente
2. ✅ `dotenv-cli` - Error de sintaxis
3. ✅ `ecosystem.config.js` con `env_file` - Pendiente de probar
4. ✅ Script mejorado que filtra líneas problemáticas - Pendiente

## 📝 Archivos Creados:

- `VERIFICAR_ENV_Y_REINICIAR.txt` - Comandos de verificación
- `PRUEBA_CONEXION_DIRECTA.txt` - Pruebas de conexión
- `SOLUCION_FINAL_PM2_ENV.txt` - Soluciones alternativas
- `CORREGIR_ENV_SERVIDOR_PASO_A_PASO.txt` - Pasos para corregir .env
- `COMANDOS_ACTIVAR_NGINX_SOMNUS.txt` - Configuración Nginx
- `VERIFICACION_FINAL_DOMINIO.txt` - Verificación dominio

## 🎯 Próximos Pasos:

1. Probar `ecosystem.config.js` con PM2
2. Si no funciona, usar script que carga `.env` línea por línea
3. Verificar que las variables se cargan correctamente con `pm2 env 0`
4. Considerar usar variables de entorno del sistema en lugar de `.env`

## 🔍 Comandos de Diagnóstico:

```bash
# Ver variables que PM2 tiene
pm2 env 0

# Ver contenido del .env
cat /var/www/somnus/.env | grep DATABASE_URL

# Probar conexión directa
cd /var/www/somnus
npm run db:generate

# Ver logs de PM2
pm2 logs somnus --lines 50 | grep -i "error\|fatal\|tenant"
```

## 💡 Posible Solución Final:

Usar `ecosystem.config.js` o cargar variables explícitamente en el script de inicio, asegurándose de que PM2 tenga acceso a las variables de entorno antes de iniciar Next.js.
