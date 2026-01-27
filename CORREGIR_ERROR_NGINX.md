# 🔧 Corregir Error de Sintaxis en Nginx

## ❌ Error

```
nginx: [emerg] unknown directive "`nginx" in /etc/nginx/sites-enabled/somnus:2
```

Esto indica que hay un carácter extraño o texto incorrecto en la línea 2 del archivo.

---

## ✅ Solución

### Paso 1: Ver el Contenido Actual

```bash
# Ver qué tiene el archivo
cat /etc/nginx/sites-available/somnus

# Ver con números de línea para identificar el problema
cat -n /etc/nginx/sites-available/somnus
```

### Paso 2: Eliminar y Recrear el Archivo

```bash
# Eliminar el archivo actual
rm /etc/nginx/sites-available/somnus

# Crear nuevo archivo limpio
nano /etc/nginx/sites-available/somnus
```

### Paso 3: Pegar Configuración Correcta

**Copia y pega EXACTAMENTE esto (sin caracteres extraños):**

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

**IMPORTANTE:**
- No copies caracteres extraños
- Asegúrate de que no haya espacios raros al inicio
- La primera línea debe ser `server {` sin nada antes

**Guardar**: `CTRL + O`, `ENTER`, `CTRL + X`

### Paso 4: Verificar y Reiniciar

```bash
# Verificar sintaxis
nginx -t

# Si pasa, deberías ver:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reiniciar Nginx
systemctl restart nginx

# Verificar estado
systemctl status nginx
```

---

## 🔍 Si el Error Persiste

### Ver el archivo línea por línea

```bash
# Ver primeras 5 líneas
head -5 /etc/nginx/sites-available/somnus

# Ver con caracteres especiales visibles
cat -A /etc/nginx/sites-available/somnus
```

### Verificar el enlace simbólico

```bash
# Verificar que el enlace apunta correctamente
ls -la /etc/nginx/sites-enabled/somnus

# Si está roto, eliminarlo y recrearlo
rm /etc/nginx/sites-enabled/somnus
ln -s /etc/nginx/sites-available/somnus /etc/nginx/sites-enabled/somnus
```

---

## 🚀 Comandos Completos

```bash
# 1. Ver contenido actual
cat /etc/nginx/sites-available/somnus

# 2. Eliminar archivo
rm /etc/nginx/sites-available/somnus

# 3. Crear nuevo archivo
nano /etc/nginx/sites-available/somnus
# (pegar configuración de arriba)

# 4. Verificar enlace
ls -la /etc/nginx/sites-enabled/somnus

# Si no existe o está roto:
rm -f /etc/nginx/sites-enabled/somnus
ln -s /etc/nginx/sites-available/somnus /etc/nginx/sites-enabled/somnus

# 5. Verificar sintaxis
nginx -t

# 6. Reiniciar
systemctl restart nginx
systemctl status nginx
```

---

## ✅ Checklist

- [ ] Archivo eliminado y recreado limpio
- [ ] Configuración pegada correctamente (sin caracteres extraños)
- [ ] Primera línea es `server {` sin espacios antes
- [ ] Enlace simbólico existe y apunta correctamente
- [ ] `nginx -t` pasa sin errores
- [ ] Nginx reiniciado y corriendo
