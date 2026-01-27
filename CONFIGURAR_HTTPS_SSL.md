# 🔒 Configurar HTTPS/SSL para Acceso a Cámara en Móviles

## ⚠️ Problema

Los navegadores móviles (Chrome, Safari, etc.) **requieren HTTPS** para acceder a la cámara por razones de seguridad. Si tu aplicación está en HTTP, la cámara no funcionará en teléfonos.

---

## 🎯 Soluciones

### ✅ Opción 1: Dominio + SSL Gratis (Let's Encrypt) - **RECOMENDADO**

Esta es la solución profesional y permanente.

#### Requisitos:
- Un dominio (ej: `boletera-regia.com` o `midominio.com`)
- Servidor con IP pública (ya lo tienes: `216.128.139.41`)

#### Pasos:

**1. Apuntar tu dominio al servidor**

En tu proveedor de dominio (GoDaddy, Namecheap, etc.), crea un registro A:
```
Tipo: A
Host: @ (o el que quieras, ej: app)
Valor: 216.128.139.41
TTL: 3600 (o automático)
```

Espera 5-30 minutos para que se propague el DNS.

**2. Instalar Certbot (Let's Encrypt)**

```bash
# Conectar al servidor
ssh root@216.128.139.41

# Instalar Certbot
apt update
apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL
certbot --nginx -d tudominio.com -d www.tudominio.com

# Seguir las instrucciones:
# - Ingresa tu email
# - Acepta términos
# - Elige "Yes" para redirección HTTPS automática
```

**3. Actualizar variables de entorno**

```bash
cd ~/boletera
nano .env
```

Cambia:
```env
NEXT_PUBLIC_APP_URL="https://tudominio.com"
```

**4. Rebuild y reiniciar**

```bash
npm run build
pm2 restart boletera
```

**5. Renovación automática**

Certbot configura renovación automática, pero puedes verificar:
```bash
# Test de renovación
certbot renew --dry-run

# Ver timer de renovación automática
systemctl status certbot.timer
```

---

### 🚀 Opción 2: Ngrok (Temporal - Para Pruebas)

**SOLO para desarrollo/pruebas**. No recomendado para producción.

#### Pasos:

**1. Instalar ngrok en tu servidor**

```bash
# Descargar ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list && \
  sudo apt update && sudo apt install ngrok

# O usar snap
snap install ngrok
```

**2. Configurar ngrok**

Regístrate en https://ngrok.com (es gratis) y obtén tu authtoken.

```bash
# Configurar token
ngrok config add-authtoken TU_TOKEN_AQUI
```

**3. Crear túnel HTTPS**

```bash
# En una nueva terminal o con PM2
ngrok http 3000

# O con PM2 (para que no se cierre)
pm2 start "ngrok http 3000" --name ngrok
pm2 save
```

Esto te dará una URL como: `https://abc123.ngrok-free.app`

**4. Usar esa URL para probar en móvil**

Abre en tu celular: `https://abc123.ngrok-free.app/accesos`

⚠️ **Desventajas de ngrok**:
- URL cambia cada vez que reinicias
- Límites de uso en plan gratuito
- Pantalla de aviso antes de entrar (plan gratuito)

---

### 🆓 Opción 3: Dominios Gratuitos

Si no tienes dominio, puedes usar servicios gratuitos:

#### a) **Freenom** (Gratis por 1 año)
- Web: https://www.freenom.com
- Dominios: `.tk`, `.ml`, `.ga`, `.cf`, `.gq`
- Pasos:
  1. Regístrate
  2. Busca un dominio disponible
  3. Obtén gratis por 12 meses
  4. Apunta a tu IP: `216.128.139.41`
  5. Sigue pasos de Certbot (Opción 1)

#### b) **DuckDNS** (Subdominio gratis permanente)
- Web: https://www.duckdns.org
- Dominios: `tuapp.duckdns.org`
- Pasos:
  1. Regístrate con tu cuenta de Google/GitHub
  2. Crea un subdominio
  3. Apunta a tu IP: `216.128.139.41`
  4. Sigue pasos de Certbot (Opción 1)

---

## 📱 Después de Configurar HTTPS

Una vez que tengas HTTPS funcionando:

1. **Actualiza tu .env**:
   ```env
   NEXT_PUBLIC_APP_URL="https://tudominio.com"
   ```

2. **Rebuild**:
   ```bash
   cd ~/boletera
   npm run build
   pm2 restart boletera
   ```

3. **Accede desde tu móvil**:
   ```
   https://tudominio.com/accesos
   ```

4. **El navegador te pedirá permiso de cámara** ✅

---

## 🔧 Configuración de Nginx para HTTPS

Después de usar Certbot, tu configuración de Nginx se verá así:

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    
    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tudominio.com www.tudominio.com;

    # Certificados SSL (Certbot los configura automáticamente)
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

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

---

## ✅ Verificar que HTTPS Funciona

```bash
# Test SSL
curl -I https://tudominio.com

# Ver certificado
openssl s_client -connect tudominio.com:443 -servername tudominio.com
```

---

## 🐛 Troubleshooting

### El celular no puede acceder al sitio

```bash
# Verificar que el firewall permite HTTPS
ufw status

# Debe mostrar:
# 443/tcp ALLOW Anywhere

# Si no está, agrégalo:
ufw allow 443/tcp
```

### Certificado expirado

```bash
# Renovar manualmente
certbot renew

# Reiniciar Nginx
systemctl restart nginx
```

### Error "NET::ERR_CERT_AUTHORITY_INVALID"

- Verifica que el dominio esté correctamente apuntado a tu IP
- Espera 5-30 minutos después de configurar el DNS
- Limpia cache del navegador (Ctrl + Shift + Delete)

---

## 💰 Costos

| Opción | Costo | Duración |
|--------|-------|----------|
| Dominio .com (Namecheap, GoDaddy) | ~$10-15 USD/año | 1 año |
| Dominio .tk/.ml (Freenom) | Gratis | 1 año |
| Subdominio DuckDNS | Gratis | Permanente |
| Certificado SSL (Let's Encrypt) | **Gratis** | 90 días (auto-renueva) |
| ngrok (plan gratuito) | Gratis | Mientras esté activo |

---

## 🎯 Recomendación Final

**Para producción**: Compra un dominio profesional (.com) por $10-15 al año y usa Let's Encrypt (gratis).

**Para desarrollo/pruebas**: Usa ngrok o DuckDNS temporalmente.

---

## 📞 ¿Tienes Dominio?

- **SÍ**: Perfecto, sigue la Opción 1 (Certbot)
- **NO**: Consigue uno en:
  - [Namecheap](https://www.namecheap.com) - $10/año
  - [GoDaddy](https://www.godaddy.com) - $12/año
  - [Freenom](https://www.freenom.com) - Gratis
  - [DuckDNS](https://www.duckdns.org) - Gratis (subdominio)

---

**Importante**: Sin HTTPS, la cámara NO funcionará en móviles modernos (Android/iOS). Es un requisito de seguridad del navegador.


