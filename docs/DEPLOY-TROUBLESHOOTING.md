# Solución: ChunkLoadError / 400 en _next/static/chunks

## Síntoma
```
/_next/static/chunks/app/page-xxx.js net::ERR_ABORTED 400 (Bad Request)
ChunkLoadError: Loading chunk failed
```

## Causas comunes

### 1. Build desactualizado o caché
El navegador tiene HTML en caché que pide chunks con hashes viejos. Tras un deploy, esos archivos ya no existen.

**Solución:**
- Hard refresh: `Ctrl+Shift+R` (o `Cmd+Shift+R` en Mac)
- Abrir en ventana de incógnito
- Borrar caché del sitio

### 2. Deploy incompleto
El servidor no tiene los archivos estáticos del último build.

**En el servidor:**
```bash
cd /var/www/somnus
git pull
npm ci
npm run build
pm2 restart somnus  # o tu proceso
```

Verificar que exista el chunk:
```bash
ls -la .next/static/chunks/app/
```

### 3. Nginx mal configurado
Si usas Nginx, **no usar `alias`** para `/_next/static/`. Usar `proxy_pass` hacia el proceso de Node:

```nginx
location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### 4. Cloudflare / CDN
Si usas Cloudflare u otro CDN:
- Purga la caché tras cada deploy
- O configura "Cache Level: Bypass" para `/_next/*`

### 5. Permisos
```bash
# El usuario que corre Node debe poder leer .next
chown -R $(whoami):$(whoami) .next
chmod -R 755 .next
```

---

## GET /api/events devuelve 500 (Internal Server Error)

### 1. Esquema de base de datos desactualizado
Si cambiaste el schema de Prisma (ej. agregaste `showQR`), la base de datos en producción debe actualizarse:

```bash
cd /var/www/somnus
npx prisma db push
pm2 restart all
```

### 2. Variables de entorno
Verifica que `DATABASE_URL` y `DIRECT_URL` estén en `.env` y apunten a la BD correcta.

### 3. Ver logs del servidor
```bash
pm2 logs somnus --lines 50
# O si usas otro nombre:
pm2 logs
```

Ahí verás el error real (ej. "column does not exist", "connection refused").

---

## Clip create-charge: Error "Unauthorized" (401)

La API de Clip rechaza la petición. Revisa:

1. **CLIP_AUTH_TOKEN en el servidor**: Debe estar en `.env` en `/var/www/somnus`:
   ```bash
   grep CLIP_AUTH_TOKEN /var/www/somnus/.env
   ```
   Si no aparece, añade:
   ```
   CLIP_AUTH_TOKEN=tu_token_de_clip
   ```

2. **Token válido**: El token puede haber expirado. Genera uno nuevo en el panel de Clip (developer.clip.mx o similar).

3. **Reiniciar tras cambiar .env**:
   ```bash
   pm2 restart somnus --update-env
   ```

---

## Login: Rate limit exceeded / 400

Supabase limita OTP (códigos por email): ~30/hora global, 60 segundos entre intentos al mismo email.

Si el usuario ve "Demasiados intentos", debe esperar 1 minuto. En Supabase Dashboard (Authentication → Rate limits) puedes ajustar los límites.
