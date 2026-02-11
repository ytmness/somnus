# 🚀 Guía de Despliegue - Servidor Somnus

## 📋 Información del Servidor
- **IP Address**: 144.202.72.150
- **Usuario**: root
- **Dominio**: somnus.live
- **Sistema**: Ubuntu (asumido)

---

## ⚠️ PASO 0: Seguridad Inicial (CRÍTICO)

Después de completar el despliegue, cambia la contraseña de root.

---

## 🔧 PASO 1: Conectar al Servidor

Desde tu terminal local (PowerShell o CMD):

```bash
ssh root@144.202.72.150
```

Ingresa la contraseña cuando te la pida.

---

## 🔄 PASO 2: Actualizar el Sistema

Una vez conectado al servidor, ejecuta:

```bash
# Actualizar paquetes
apt update && apt upgrade -y

# Instalar utilidades básicas
apt install -y curl wget git ufw
```

---

## 📦 PASO 3: Instalar Node.js (v20 LTS)

```bash
# Instalar Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalación
node -v
npm -v
```

---

## 🔥 PASO 4: Instalar PM2 (Gestor de Procesos)

PM2 mantendrá tu aplicación corriendo siempre:

```bash
npm install -g pm2

# Verificar instalación
pm2 -v
```

---

## 📂 PASO 5: Clonar el Repositorio de Somnus

```bash
# Ir al directorio de aplicaciones
cd /var/www

# Clonar el repositorio de Somnus
git clone https://github.com/ytmness/somnus.git

# Entrar al directorio
cd somnus
```

---

## 🔐 PASO 6: Configurar Variables de Entorno

```bash
# Crear archivo .env
nano .env
```

Copia y pega esto (ajusta con tus valores reales de Supabase):

```env
# Database
DATABASE_URL="postgresql://postgres:[TU-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key-aqui"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key-aqui"

# JWT Secret
JWT_SECRET="tu-jwt-secret-super-seguro-aqui"

# Next.js - IMPORTANTE: Usar el dominio
NEXT_PUBLIC_APP_URL="https://somnus.live"
NEXT_PUBLIC_APP_NAME="Somnus - Boletera"

# QR Secret
QR_SECRET_KEY="somnus-qr-secret-2025-cambiar-en-produccion"

# Node Environment
NODE_ENV="production"
```

**Guardar**: `CTRL + O`, luego `ENTER`, luego `CTRL + X`

---

## 📥 PASO 7: Instalar Dependencias

```bash
# Instalar dependencias
npm install

# Generar Prisma Client
npm run db:generate

# Aplicar schema a la base de datos
npm run db:push
```

---

## 🏗️ PASO 8: Build de Producción

```bash
# Crear build de producción
npm run build
```

---

## 🚀 PASO 9: Iniciar con PM2

```bash
# Iniciar aplicación con PM2
pm2 start npm --name "somnus" -- start

# Configurar PM2 para iniciar al arrancar el servidor
pm2 startup
pm2 save

# Ver el estado
pm2 status

# Ver logs en tiempo real
pm2 logs somnus
```

---

## 🌐 PASO 10: Configurar Nginx (Reverse Proxy)

### Instalar Nginx

```bash
apt install -y nginx
```

### Configurar el sitio

```bash
# Crear configuración del sitio
nano /etc/nginx/sites-available/somnus
```

Pega esta configuración:

```nginx
server {
    listen 80;
    server_name somnus.live www.somnus.live;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Guardar**: `CTRL + O`, `ENTER`, `CTRL + X`

### Activar el sitio

```bash
# Crear enlace simbólico
ln -s /etc/nginx/sites-available/somnus /etc/nginx/sites-enabled/

# Eliminar sitio por defecto
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

# Reiniciar Nginx
systemctl restart nginx
systemctl enable nginx
```

---

## 🔒 PASO 11: Configurar Firewall

```bash
# Habilitar UFW
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw enable

# Ver estado
ufw status
```

---

## 🌍 PASO 12: Configurar DNS en GoDaddy

**IMPORTANTE**: Antes de instalar SSL, configura el DNS:

1. Ve a tu panel de GoDaddy
2. Edita el registro A:
   - Tipo: `A`
   - Nombre: `@`
   - Valor: `144.202.72.150`
   - TTL: `600 segundos`
3. Verifica que el CNAME de `www` apunte a `somnus.live.`
4. Espera 5-30 minutos para propagación DNS

---

## 🔐 PASO 13: Instalar SSL con Let's Encrypt

```bash
# Instalar Certbot
apt update
apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL
certbot --nginx -d somnus.live -d www.somnus.live

# Seguir las instrucciones:
# - Ingresa tu email
# - Acepta términos (escribe 'A')
# - Compartir email: 'N' o 'Y'
# - Redirección HTTP a HTTPS: '2' (redirección automática)
```

---

## ✅ PASO 14: Verificar que Todo Funciona

Abre tu navegador y ve a:

**https://somnus.live**

¡Deberías ver tu aplicación funcionando con HTTPS! 🎉

---

## 🔧 Comandos Útiles de PM2

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

# Eliminar aplicación de PM2
pm2 delete somnus

# Ver uso de recursos
pm2 monit
```

---

## 🔄 Para Actualizar la Aplicación (Después de Hacer Cambios)

```bash
# Conectar al servidor
ssh root@144.202.72.150

# Ir al directorio
cd /var/www/somnus

# Obtener cambios
git pull origin main

# Instalar nuevas dependencias (si las hay)
npm install

# Generar Prisma (si cambió el schema)
npm run db:generate
npm run db:push

# Rebuild
npm run build

# Reiniciar
pm2 restart somnus
```

---

## 🛡️ PASO 15: Cambiar Contraseña de Root (IMPORTANTE)

```bash
# Cambiar contraseña de root
passwd root
```

Sigue las instrucciones para establecer una nueva contraseña segura.

---

## 🐛 Solución de Problemas

### La aplicación no carga

```bash
# Ver logs
pm2 logs somnus

# Verificar que Next.js está corriendo
netstat -tlnp | grep 3000

# Verificar Nginx
systemctl status nginx
nginx -t
```

### Error de base de datos

```bash
cd /var/www/somnus
npm run db:push
pm2 restart somnus
```

### Cambios no se reflejan

```bash
cd /var/www/somnus
git pull
npm install
npm run build
pm2 restart somnus
pm2 logs somnus
```

### SSL no funciona

```bash
# Verificar certificado
certbot certificates

# Renovar manualmente si es necesario
certbot renew
systemctl restart nginx
```

---

## 📞 Acceso Posterior al Servidor

Siempre que necesites entrar al servidor:

```bash
ssh root@144.202.72.150
```

---

## 🎯 Resumen Rápido

1. ✅ Conectar: `ssh root@144.202.72.150`
2. ✅ Actualizar sistema: `apt update && apt upgrade -y`
3. ✅ Instalar Node.js 20
4. ✅ Instalar PM2: `npm install -g pm2`
5. ✅ Clonar repo en `/var/www/somnus`
6. ✅ Configurar `.env` con `NEXT_PUBLIC_APP_URL="https://somnus.live"`
7. ✅ Instalar dependencias: `npm install`
8. ✅ Build: `npm run build`
9. ✅ Iniciar: `pm2 start npm --name "somnus" -- start`
10. ✅ Instalar Nginx y configurar
11. ✅ Configurar DNS en GoDaddy (A record → 144.202.72.150)
12. ✅ Instalar SSL con Certbot
13. ✅ Configurar firewall
14. ✅ **Cambiar contraseña de root**

---

## 🎉 ¡Listo!

Tu aplicación Somnus estará disponible en: **https://somnus.live**

---

## 📝 Notas Importantes

- **Repositorio**: Usa `https://github.com/ytmness/somnus.git` (NO boletera)
- **Nombre PM2**: `somnus` (no boletera)
- **Directorio**: `/var/www/somnus` (no boletera)
- **Dominio**: `somnus.live`
- **IP**: `144.202.72.150`
