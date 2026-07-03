# 🔧 Eliminar Línea Problemática del Archivo Nginx

## ❌ Problema Detectado

El archivo tiene en la primera línea: `` `nginx ``

Esto causa el error: `unknown directive "`nginx"`

---

## ✅ Solución

### Opción 1: Eliminar y Recrear (Recomendado)

```bash
# Eliminar archivo
rm /etc/nginx/sites-available/somnus

# Crear nuevo archivo limpio
nano /etc/nginx/sites-available/somnus
```

**Pega SOLO esto (sin la línea `\`nginx`):**

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Guardar**: `CTRL + O`, `ENTER`, `CTRL + X`

### Opción 2: Editar y Eliminar Primera Línea

```bash
# Editar archivo
nano /etc/nginx/sites-available/somnus

# Eliminar la primera línea que dice: `nginx
# Dejar solo desde "server {" en adelante
```

---

## 🚀 Después de Corregir

```bash
# Verificar sintaxis
nginx -t

# Debería mostrar:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reiniciar Nginx
systemctl restart nginx

# Verificar estado
systemctl status nginx
```

---

## 📝 Nota sobre Apache

Veo que Apache está usando el puerto 80 para otros sitios. Tienes dos opciones:

### Opción A: Detener Apache (si no lo necesitas)
```bash
systemctl stop apache2
systemctl disable apache2
```

### Opción B: Dejar Apache y usar Nginx solo para somnus.live
Nginx puede manejar solo `somnus.live` mientras Apache maneja otros dominios, pero solo uno puede usar el puerto 80 a la vez. Necesitarías:
- Detener Apache temporalmente para que Nginx use puerto 80
- O configurar Nginx en otro puerto (no recomendado)
