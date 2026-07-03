# 🌐 Configurar DNS y Nginx para Somnus.live

## 📋 Información del Servidor

- **IP del Servidor**: `144.202.72.150`
- **Dominio**: `somnus.live`
- **Puerto de la App**: `3000` (Next.js con PM2)

---

## 🔧 PASO 1: Configurar Registros DNS

Ve a tu proveedor de dominio (GoDaddy según los registros que mostraste) y configura estos registros:

### Registros DNS Necesarios

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| **A** | `@` | `144.202.72.150` | 600 segundos |
| **A** | `www` | `144.202.72.150` | 600 segundos |

### Instrucciones para GoDaddy

1. **Inicia sesión en GoDaddy**
   - Ve a: https://dcc.godaddy.com/
   - Inicia sesión con tu cuenta

2. **Accede a la gestión de DNS**
   - Busca tu dominio `somnus.live`
   - Haz clic en **"DNS"** o **"Manage DNS"**

3. **Configura el registro A para el dominio raíz**
   - Busca el registro tipo **A** con nombre `@`
   - Si existe, edítalo
   - Si no existe, créalo
   - **Valor**: `144.202.72.150`
   - **TTL**: `600 segundos` (o el mínimo disponible)
   - Guarda

4. **Configura el registro A para www**
   - Busca el registro tipo **A** con nombre `www`
   - Si existe, edítalo
   - Si no existe, créalo
   - **Valor**: `144.202.72.150`
   - **TTL**: `600 segundos`
   - Guarda

5. **Elimina o actualiza el CNAME de www** (si existe)
   - Si hay un CNAME de `www` que apunta a otro lugar, elimínalo
   - O cámbialo por el registro A de arriba

### Estado Actual de tus Registros DNS

Según lo que mostraste antes, tienes:
- ✅ `a @ Parked` - **CAMBIAR** a `144.202.72.150`
- ✅ `cname www somnus.live.` - **CAMBIAR** a registro A con `144.202.72.150`
- ✅ `ns @ ns47.domaincontrol.com.` - Dejar como está
- ✅ `ns @ ns48.domaincontrol.com.` - Dejar como está

---

## 🚀 PASO 2: Instalar y Configurar Nginx

### 2.1 Instalar Nginx

```bash
# Actualizar paquetes
apt update

# Instalar Nginx
apt install -y nginx

# Verificar instalación
nginx -v

# Verificar que está corriendo
systemctl status nginx
```

### 2.2 Crear Configuración del Sitio

```bash
# Crear archivo de configuración
nano /etc/nginx/sites-available/somnus
```

**Pega esta configuración:**

```nginx
server {
    listen 80;
    server_name somnus.live www.somnus.live;

    # Logs
    access_log /var/log/nginx/somnus-access.log;
    error_log /var/log/nginx/somnus-error.log;

    # Tamaño máximo de archivos subidos
    client_max_body_size 20M;

    # Proxy a Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Servir archivos estáticos de Next.js directamente
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Favicon y otros archivos estáticos
    location /favicon.ico {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

**Guardar**: `CTRL + O`, `ENTER`, `CTRL + X`

### 2.3 Activar el Sitio

```bash
# Crear enlace simbólico
ln -s /etc/nginx/sites-available/somnus /etc/nginx/sites-enabled/

# Eliminar sitio por defecto (opcional)
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

# Si todo está bien, deberías ver:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reiniciar Nginx
systemctl restart nginx

# Habilitar Nginx para que inicie al arrancar
systemctl enable nginx

# Verificar estado
systemctl status nginx
```

---

## 🔒 PASO 3: Configurar Firewall

```bash
# Verificar estado del firewall
ufw status

# Si no está activo, configurarlo:
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS (para SSL más adelante)
ufw enable

# Verificar
ufw status
```

---

## ✅ PASO 4: Verificar que Todo Funciona

### 4.1 Verificar que PM2 está corriendo

```bash
pm2 status
pm2 logs somnus --lines 10
```

### 4.2 Verificar que la app responde localmente

```bash
curl http://localhost:3000 | head -20
```

### 4.3 Verificar que Nginx está corriendo

```bash
systemctl status nginx
curl http://localhost | head -20
```

### 4.4 Verificar DNS (desde tu computadora)

```bash
# En Windows PowerShell o CMD
nslookup somnus.live
nslookup www.somnus.live

# Deberían mostrar: 144.202.72.150
```

### 4.5 Probar desde el navegador

1. Espera 5-10 minutos después de cambiar DNS (propagación)
2. Abre: `http://somnus.live`
3. Debería cargar tu aplicación

---

## 🔍 Troubleshooting

### DNS no resuelve

```bash
# Verificar desde el servidor
dig somnus.live
nslookup somnus.live

# Si no funciona, espera más tiempo (hasta 24 horas)
# O verifica que los registros DNS están correctos en GoDaddy
```

### Nginx no inicia

```bash
# Ver logs de error
tail -f /var/log/nginx/error.log

# Verificar configuración
nginx -t

# Verificar que el puerto 80 no está ocupado
netstat -tlnp | grep :80
```

### La app no carga

```bash
# Verificar que PM2 está corriendo
pm2 status

# Ver logs de la app
pm2 logs somnus

# Verificar que responde en localhost:3000
curl http://localhost:3000
```

### Error 502 Bad Gateway

Esto significa que Nginx no puede conectarse a la app:

```bash
# Verificar que PM2 está corriendo
pm2 restart somnus

# Verificar logs
pm2 logs somnus --err

# Verificar que el puerto 3000 está abierto
netstat -tlnp | grep :3000
```

---

## 📝 Resumen de Comandos

```bash
# 1. Instalar Nginx
apt update && apt install -y nginx

# 2. Crear configuración
nano /etc/nginx/sites-available/somnus
# (pegar configuración de arriba)

# 3. Activar sitio
ln -s /etc/nginx/sites-available/somnus /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

# 4. Configurar firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 5. Verificar
pm2 status
systemctl status nginx
curl http://localhost:3000
```

---

## 🔐 Próximos Pasos (Opcional)

Después de que todo funcione, puedes configurar SSL/HTTPS con Let's Encrypt:

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL
certbot --nginx -d somnus.live -d www.somnus.live

# Renovar automáticamente
certbot renew --dry-run
```

---

## ✅ Checklist

- [ ] Registros DNS configurados en GoDaddy
- [ ] Registro A para `@` apunta a `144.202.72.150`
- [ ] Registro A para `www` apunta a `144.202.72.150`
- [ ] Nginx instalado
- [ ] Configuración de Nginx creada en `/etc/nginx/sites-available/somnus`
- [ ] Sitio activado con enlace simbólico
- [ ] Nginx reiniciado y funcionando
- [ ] Firewall configurado (puertos 22, 80, 443)
- [ ] PM2 corriendo la aplicación
- [ ] DNS propagado (verificado con nslookup)
- [ ] Sitio accesible desde navegador

---

## 📞 Soporte

Si algo no funciona:
1. Verifica los logs: `pm2 logs somnus` y `tail -f /var/log/nginx/error.log`
2. Verifica DNS: `nslookup somnus.live`
3. Verifica conectividad: `curl http://localhost:3000`
