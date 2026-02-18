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
