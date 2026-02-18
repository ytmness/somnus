# Dónde poner las claves de Clip

## 1. Local (desarrollo)

Crea o edita el archivo **`.env.local`** en la raíz del proyecto (al mismo nivel que `package.json`):

```
somnus-main/
├── .env.local    ← aquí
├── package.json
├── app/
└── ...
```

Agrega estas variables con tus valores reales:

```env
# Clave pública – se usa en el frontend (SDK Clip)
NEXT_PUBLIC_CLIP_API_KEY=tu_api_key_publica_o_developer

# Solo backend – NUNCA exponer en frontend
CLIP_AUTH_TOKEN=tu_token_secreto
CLIP_WEBHOOK_SECRET=tu_webhook_secret

# URL de tu app (local o producción)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ **Importante:** `.env.local` está en `.gitignore`, así que nunca se sube a Git. Es el lugar seguro para tus secretos.

---

## 2. Producción (servidor / Vercel / etc.)

### Si usas Vercel
- Project → Settings → Environment Variables
- Añade cada variable con su valor para Production (y Preview si aplica)

### Si usas VPS (Vultr, DigitalOcean, etc.)
- Crea `.env.local` o `.env.production` en el servidor
- O define las variables en el archivo de entorno de tu proceso (pm2, systemd, etc.)

### Si usas Docker
- Pásalas con `-e` o en un archivo `.env` que no se incluya en la imagen

---

## 3. Resumen de variables

| Variable | Dónde se usa | ¿Pública? |
|----------|--------------|------------|
| `NEXT_PUBLIC_CLIP_API_KEY` | SDK Clip en el frontend | Sí (el prefijo `NEXT_PUBLIC_` la expone al navegador) |
| `CLIP_AUTH_TOKEN` | Backend al llamar a Clip | No – solo servidor |
| `CLIP_WEBHOOK_SECRET` | Validar webhooks de Clip | No – solo servidor |
| `NEXT_PUBLIC_APP_URL` | Callbacks / redirects | Sí |

---

## 4. Seguridad

- **No** copies valores reales en `.env.example` ni en ningún `.md` del repo.
- Si alguna clave se expuso, rótala en el dashboard de Clip.
- En producción, usa `NEXT_PUBLIC_APP_URL=https://tu-dominio.com` (HTTPS).
