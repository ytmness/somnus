# Diagnóstico general (Somnus vs Boletera)

## Requisitos del servidor

| Requisito | Detalle |
|-----------|---------|
| **Node.js ≥20** | Next.js y @supabase/supabase-js ya no soportan Node 18. Actualizar con `nvm use 20` o `n 20`. |
| **Variables de entorno** | PM2 **no** recarga `.env` automáticamente al reiniciar. Tras editar `.env` usa: `pm2 restart somnus --update-env` |

## Clip: variables vs Boletera

Somnus usa `CLIP_AUTH_TOKEN` (token secreto backend). Boletera podría usar `CLIP_API_KEY` u otro nombre. En ambos casos el flujo es:

1. Frontend: SDK tokeniza la tarjeta con `NEXT_PUBLIC_CLIP_API_KEY`
2. Backend: crea el cargo con `Authorization: Bearer <token_secreto>`
3. El **token secreto** debe coincidir con el ambiente (sandbox vs producción) y la URL por defecto es `https://api.payclip.com`

## Supabase: getUser vs getSession

Supabase recomienda usar `getUser()` en servidor (valida contra el Auth server) en lugar de `getSession()` (lee solo de cookies). Somnus ya usa `getUser()` en `lib/auth/supabase-auth.ts`.

## Flujo de prueba de pagos Clip

1. Probar localmente: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
2. Verificar en la consola de Clip que el pago se complete
3. En producción: token correcto en `.env` + `pm2 restart somnus --update-env`

---

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

## Error: Failed to find Server Action "x"

Síntoma en logs:
```
Error: Failed to find Server Action "x". This request might be from an older or newer deployment.
```

**Causa:** El cliente (navegador) tiene código en caché que apunta a Server Actions que ya no existen en el build actual del servidor.

**Solución:**
1. **Build limpio en el servidor:**
   ```bash
   cd /var/www/somnus
   rm -rf .next
   git pull
   npm install
   npm run build
   pm2 restart somnus
   ```
2. **Un solo proceso PM2** – Si usas `instances: 2` o más, asegúrate de que todos corran el mismo build.
3. **Hard refresh en el navegador:** `Ctrl+Shift+R` (o `Cmd+Shift+R` en Mac) para limpiar caché.
4. **Verificar reinicios** – Si la app se reinicia muchas veces, puede haber un crash loop. Revisa `pm2 logs` para la causa.

---

## Clip create-charge: Error "Unauthorized" (401)

La API de Clip rechaza el Bearer token.

**Causas posibles:**
- Token equivocado: `CLIP_AUTH_TOKEN` debe ser el **token secreto** del backend, NO `NEXT_PUBLIC_CLIP_API_KEY` (esa es para el frontend).
- Token expirado o revocado.
- URL incorrecta: por defecto usamos `api.payclip.com`. Si Clip te indica otra (ej. `api.clip.mx` o sandbox), añade `CLIP_API_URL=https://...` en `.env`.

1. **CLIP_AUTH_TOKEN en el servidor** – Debe estar en `.env` en `/var/www/somnus`:
   ```bash
   grep CLIP_AUTH_TOKEN /var/www/somnus/.env
   ```
   Si no aparece, añade:
   ```
   CLIP_AUTH_TOKEN=tu_token_de_clip
   ```

2. **Token válido** – El token puede haber expirado. Entra a [Clip Developer](https://developer.clip.mx) o tu panel de Clip y genera uno nuevo. Copia el token completo (sin espacios).

3. **Reiniciar tras cambiar .env** – PM2 no recarga variables automáticamente; usa `--update-env`:
   ```bash
   pm2 restart somnus --update-env
   ```

4. **Token y ambiente** – Asegura que el token secreto corresponda al ambiente correcto (sandbox vs producción) y que la API URL sea la esperada.

---

## Login: Rate limit exceeded / 400

Supabase limita OTP (códigos por email): ~30/hora global, 60 segundos entre intentos al mismo email.

Si el usuario ve "Demasiados intentos", debe esperar 1 minuto. La UI muestra un countdown de 60 segundos. En Supabase Dashboard (Authentication → Rate limits) puedes ajustar los límites.

---

## Errores 404 en recursos

Si ves "Failed to load resource: 404" en la consola:

1. Abre DevTools (F12) → pestaña **Network**
2. Filtra por "404" o busca requests en rojo
3. Revisa la URL exacta que falla:
   - `/_next/static/chunks/...` → Chunk antiguo, haz hard refresh (Ctrl+Shift+R) o redeploy
   - `/_next/image?url=...` → La imagen externa no está en remotePatterns de next.config
   - `/api/...` → La ruta no existe o hay error en el servidor
