# 🚀 Guía de Despliegue en Vultr Ubuntu

## 📋 Información del Servidor
- **IP Address**: 216.128.139.41
- **Usuario**: root
- **Sistema**: Ubuntu

---

## ⚠️ PASO 0: Seguridad Inicial (CRÍTICO)

Después de completar el despliegue, debes cambiar la contraseña de root porque la compartiste públicamente.

---

## 🔧 PASO 1: Conectar al Servidor

Desde tu terminal local (PowerShell o CMD):

```bash
ssh root@216.128.139.41
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

## 📂 PASO 5: Clonar el Repositorio

```bash
# Ir al directorio de aplicaciones
cd /var/www

# Clonar tu repositorio
git clone https://github.com/ytmness/boletera.git

# Entrar al directorio
cd boletera
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

# Next.js
NEXT_PUBLIC_APP_URL="http://216.128.139.41:3000"

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
pm2 start npm --name "boletera" -- start

# Configurar PM2 para iniciar al arrancar el servidor
pm2 startup
pm2 save

# Ver el estado
pm2 status

# Ver logs en tiempo real
pm2 logs boletera
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
nano /etc/nginx/sites-available/boletera
```

Pega esta configuración:

```nginx
server {
    listen 80;
    server_name 216.128.139.41;

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
ln -s /etc/nginx/sites-available/boletera /etc/nginx/sites-enabled/

# Eliminar sitio por defecto
rm /etc/nginx/sites-enabled/default

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

## 🎯 PASO 12: Actualizar URL en .env

```bash
cd /var/www/boletera
nano .env
```

Cambia:
```env
NEXT_PUBLIC_APP_URL="http://216.128.139.41"
```

**Guardar** y luego:

```bash
# Rebuild
npm run build

# Reiniciar PM2
pm2 restart boletera
```

---

## ✅ PASO 13: Verificar que Todo Funciona

Abre tu navegador y ve a:

**http://216.128.139.41**

¡Deberías ver tu aplicación funcionando! 🎉

---

## 🔧 Comandos Útiles de PM2

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs en tiempo real
pm2 logs boletera

# Ver logs de errores
pm2 logs boletera --err

# Reiniciar aplicación
pm2 restart boletera

# Detener aplicación
pm2 stop boletera

# Eliminar aplicación de PM2
pm2 delete boletera

# Ver uso de recursos
pm2 monit
```

---

## 🔄 Para Actualizar la Aplicación (Después de Hacer Cambios)

```bash
# Conectar al servidor
ssh root@216.128.139.41

# Ir al directorio
cd /var/www/boletera

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
pm2 restart boletera
```

---

## 🛡️ PASO 14: Cambiar Contraseña de Root (IMPORTANTE)

```bash
# Cambiar contraseña de root
passwd root
```

Sigue las instrucciones para establecer una nueva contraseña segura.

---

## 🌍 PASO 15 (Opcional): Configurar Dominio

Si tienes un dominio (ejemplo: `boletera-regia.com`):

1. **En tu proveedor de dominio**, agrega un registro A:
   - Host: `@` o tu subdominio
   - Apunta a: `216.128.139.41`

2. **Edita la configuración de Nginx**:
   ```bash
   nano /etc/nginx/sites-available/boletera
   ```
   
   Cambia:
   ```nginx
   server_name tu-dominio.com www.tu-dominio.com;
   ```

3. **Instalar SSL con Let's Encrypt**:
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
   ```

4. **Actualizar .env**:
   ```bash
   nano /var/www/boletera/.env
   ```
   
   Cambiar:
   ```env
   NEXT_PUBLIC_APP_URL="https://tu-dominio.com"
   ```

5. **Rebuild y reiniciar**:
   ```bash
   cd /var/www/boletera
   npm run build
   pm2 restart boletera
   ```

---

## 🐛 Solución de Problemas

### La aplicación no carga

```bash
# Ver logs
pm2 logs boletera

# Verificar que Next.js está corriendo
netstat -tlnp | grep 3000

# Verificar Nginx
systemctl status nginx
nginx -t
```

### Error de base de datos

```bash
cd /var/www/boletera
npm run db:push
pm2 restart boletera
```

### Cambios no se reflejan

```bash
cd /var/www/boletera
git pull
npm install
npm run build
pm2 restart boletera
pm2 logs boletera
```

---

## 📞 Acceso Posterior al Servidor

Siempre que necesites entrar al servidor:

```bash
ssh root@216.128.139.41
```

---

## 🎯 Resumen Rápido

1. ✅ Conectar: `ssh root@216.128.139.41`
2. ✅ Actualizar sistema: `apt update && apt upgrade -y`
3. ✅ Instalar Node.js 20
4. ✅ Instalar PM2: `npm install -g pm2`
5. ✅ Clonar repo en `/var/www/boletera`
6. ✅ Configurar `.env`
7. ✅ Instalar dependencias: `npm install`
8. ✅ Build: `npm run build`
9. ✅ Iniciar: `pm2 start npm --name "boletera" -- start`
10. ✅ Instalar Nginx y configurar
11. ✅ Configurar firewall
12. ✅ **Cambiar contraseña de root**

---

## 🎉 ¡Listo!

Tu aplicación estará disponible en: **http://216.128.139.41**


