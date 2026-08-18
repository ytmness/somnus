# 🌐 Configurar Dominio Somnus.live

## 📋 Configuración DNS en GoDaddy

### Paso 1: Configurar Registro A (Dominio Principal)

En tu panel de GoDaddy, edita el registro A que está "Parked":

```
Tipo: A
Nombre/Host: @
Valor/Datos: 144.202.72.150
TTL: 600 segundos (o 1 Hora)
```

**Importante**: Elimina o cambia el valor "Parked" por la IP `144.202.72.150`

### Paso 2: Verificar CNAME de www

Tu CNAME ya está configurado correctamente:
```
Tipo: CNAME
Nombre/Host: www
Valor/Datos: somnus.live.
TTL: 1 Hora
```

Este está bien, no lo cambies.

### Paso 3: Esperar Propagación DNS

Después de hacer los cambios:
- Espera **5-30 minutos** para que se propague el DNS
- Puedes verificar con: `nslookup somnus.live` o `ping somnus.live`
- Debe resolver a: `144.202.72.150`

---

## 🔧 Configuración en el Servidor

### Paso 1: Conectar al Servidor

```bash
ssh root@144.202.72.150
```

### Paso 2: Actualizar Configuración de Nginx

```bash
# Editar configuración de Nginx
nano /etc/nginx/sites-available/somnus
```

Reemplaza el contenido con esto:

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

### Paso 3: Verificar y Reiniciar Nginx

```bash
# Verificar que la configuración es correcta
nginx -t

# Si todo está bien, reiniciar Nginx
systemctl restart nginx
```

### Paso 4: Instalar Certbot (SSL Gratis)

```bash
# Actualizar sistema
apt update

# Instalar Certbot
apt install -y certbot python3-certbot-nginx
```

### Paso 5: Obtener Certificado SSL

```bash
# Obtener certificado SSL para somnus.live y www.somnus.live
certbot --nginx -d somnus.live -d www.somnus.live
```

**Durante la instalación te preguntará:**
1. **Email**: Ingresa tu email (para notificaciones de renovación)
2. **Términos**: Escribe `A` para aceptar
3. **Compartir email**: Escribe `N` (No) o `Y` (Yes), tu elección
4. **Redirección HTTP a HTTPS**: Escribe `2` para redirección automática

### Paso 6: Verificar que SSL Funciona

```bash
# Verificar certificado
certbot certificates

# Test de renovación (no renueva realmente)
certbot renew --dry-run
```

### Paso 7: Actualizar Variables de Entorno

```bash
# Ir al directorio de la aplicación
cd /var/www/boletera

# Editar .env
nano .env
```

Cambia esta línea:
```env
NEXT_PUBLIC_APP_URL="https://somnus.live"
```

**Guardar**: `CTRL + O`, `ENTER`, `CTRL + X`

### Paso 8: Rebuild y Reiniciar

```bash
# Rebuild de la aplicación
npm run build

# Reiniciar PM2
pm2 restart somnus

# Ver logs para verificar que todo está bien
pm2 logs somnus
```

---

## ✅ Verificar que Todo Funciona

### 1. Verificar DNS

```bash
# Desde tu computadora local
nslookup somnus.live
# Debe mostrar: 144.202.72.150

ping somnus.live
# Debe responder desde 144.202.72.150
```

### 2. Verificar HTTP (antes de SSL)

Abre en tu navegador:
```
http://somnus.live
```

Deberías ver tu aplicación (sin SSL todavía).

### 3. Verificar HTTPS (después de SSL)

Abre en tu navegador:
```
https://somnus.live
```

Deberías ver tu aplicación con el candado verde 🔒

### 4. Verificar Redirección

Abre:
```
http://somnus.live
```

Debería redirigir automáticamente a `https://somnus.live`

---

## 🔍 Troubleshooting

### El dominio no resuelve

```bash
# Verificar DNS desde el servidor
dig somnus.live
nslookup somnus.live

# Si no resuelve, espera más tiempo (hasta 24 horas en casos extremos)
```

### Error "Domain not found" en Certbot

- Verifica que el registro A esté apuntando correctamente a `144.202.72.150`
- Espera más tiempo para propagación DNS
- Verifica con: `nslookup somnus.live` desde tu computadora

### Nginx no inicia

```bash
# Verificar configuración
nginx -t

# Ver logs de error
tail -f /var/log/nginx/error.log
```

### Certificado no se renueva automáticamente

```bash
# Verificar timer de renovación
systemctl status certbot.timer

# Renovar manualmente si es necesario
certbot renew
systemctl restart nginx
```

### La aplicación no carga

```bash
# Verificar que PM2 está corriendo
pm2 status

# Ver logs
pm2 logs somnus

# Verificar que Next.js está escuchando en puerto 3000
netstat -tlnp | grep 3000
```

---

## 📝 Resumen de Registros DNS Necesarios

En GoDaddy debes tener:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | @ | 144.202.72.150 | 600 seg |
| CNAME | www | somnus.live. | 1 Hora |
| NS | @ | ns47.domaincontrol.com. | 1 Hora |
| NS | @ | ns48.domaincontrol.com. | 1 Hora |
| TXT | _dmarc | (mantener como está) | 1 Hora |

**NO elimines ni modifiques:**
- Registros NS (son de GoDaddy)
- Registro SOA
- Registro TXT _dmarc
- CNAME _domainconnect

---

## 🎯 Checklist Final

- [ ] Registro A configurado apuntando a `144.202.72.150`
- [ ] CNAME www configurado correctamente
- [ ] DNS propagado (verificado con nslookup)
- [ ] Nginx configurado con `server_name somnus.live www.somnus.live`
- [ ] Certbot instalado
- [ ] Certificado SSL obtenido
- [ ] `.env` actualizado con `https://somnus.live`
- [ ] Aplicación rebuild y reiniciada
- [ ] HTTPS funcionando correctamente
- [ ] Redirección HTTP → HTTPS funcionando

---

## 🚀 Comandos Rápidos

```bash
# Conectar al servidor
ssh root@144.202.72.150

# Ver estado de Nginx
systemctl status nginx

# Ver logs de Nginx
tail -f /var/log/nginx/error.log

# Ver estado de PM2
pm2 status

# Ver logs de la aplicación
pm2 logs somnus

# Reiniciar todo
systemctl restart nginx
pm2 restart somnus
```

---

## 📞 Notas Importantes

1. **Propagación DNS**: Puede tardar desde 5 minutos hasta 24 horas. Normalmente es 5-30 minutos.

2. **Renovación SSL**: Let's Encrypt renueva automáticamente cada 90 días. No necesitas hacer nada.

3. **Firewall**: Asegúrate de que los puertos 80 y 443 estén abiertos:
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw status
   ```

4. **Backup**: Antes de hacer cambios importantes, haz backup:
   ```bash
   cp /etc/nginx/sites-available/somnus /etc/nginx/sites-available/somnus.backup
   ```

---

¡Listo! Tu dominio `somnus.live` debería estar funcionando con HTTPS. 🎉
