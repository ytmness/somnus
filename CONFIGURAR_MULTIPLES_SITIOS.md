# 🌐 Configurar Múltiples Sitios en el Mismo Servidor

## 🔍 Verificar Configuración Actual

### Ver qué sitios están configurados

```bash
# Ver sitios disponibles en Nginx
ls -la /etc/nginx/sites-available/

# Ver sitios activos en Nginx
ls -la /etc/nginx/sites-enabled/

# Ver sitios disponibles en Apache
ls -la /etc/apache2/sites-available/

# Ver sitios activos en Apache
ls -la /etc/apache2/sites-enabled/
```

### Ver configuración de somnus

```bash
# Ver configuración de Nginx para somnus
cat /etc/nginx/sites-available/somnus

# Ver si el enlace simbólico existe
ls -la /etc/nginx/sites-enabled/somnus
```

---

## ✅ Opciones de Configuración

### Opción 1: Usar Solo Nginx (Recomendado)

Si quieres usar solo Nginx para todos los sitios:

```bash
# 1. Verificar configuración de somnus
cat /etc/nginx/sites-available/somnus

# 2. Verificar que el enlace existe (ya existe según el error)
ls -la /etc/nginx/sites-enabled/somnus

# 3. Verificar sintaxis de Nginx
nginx -t

# 4. Si Apache está corriendo y quieres detenerlo solo para somnus,
#    puedes configurar Apache para que no use el puerto 80
#    O simplemente dejar ambos corriendo y usar diferentes puertos
```

### Opción 2: Usar Apache para Otros Sitios, Nginx para Somnus

Si otros sitios necesitan Apache:

```bash
# Configurar Apache para usar puerto 8080 u otro
# Y dejar Nginx en puerto 80 para somnus

# O usar diferentes dominios/subdominios
```

### Opción 3: Verificar que la Configuración de Somnus es Correcta

```bash
# Ver contenido del archivo de configuración
cat /etc/nginx/sites-available/somnus

# Debería tener algo como:
# server {
#     listen 80;
#     server_name somnus.live www.somnus.live;
#     ...
# }
```

---

## 🔧 Solución: Verificar y Corregir Configuración

### Paso 1: Verificar que el Enlace Existe

```bash
# El enlace ya existe, verificar que apunta correctamente
ls -la /etc/nginx/sites-enabled/somnus

# Debería mostrar algo como:
# somnus -> /etc/nginx/sites-available/somnus
```

### Paso 2: Verificar Contenido del Archivo

```bash
# Ver configuración completa
cat /etc/nginx/sites-available/somnus
```

### Paso 3: Si el Archivo Está Vacío o Incorrecto

```bash
# Editar configuración
nano /etc/nginx/sites-available/somnus
```

**Pega esta configuración:**

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

### Paso 4: Verificar y Reiniciar

```bash
# Verificar sintaxis
nginx -t

# Si hay errores, ver logs
tail -20 /var/log/nginx/error.log

# Reiniciar Nginx
systemctl restart nginx

# Verificar estado
systemctl status nginx
```

---

## 🔍 Verificar Conflictos con Otros Sitios

### Ver todas las configuraciones de Nginx

```bash
# Ver todos los sitios configurados
grep -r "server_name" /etc/nginx/sites-enabled/

# Ver todos los puertos en uso
grep -r "listen" /etc/nginx/sites-enabled/
```

### Ver si hay conflictos de puertos

```bash
# Ver qué está usando el puerto 80
sudo ss -tlnp | grep :80

# Ver qué está usando el puerto 3000 (tu app Next.js)
sudo ss -tlnp | grep :3000
```

---

## 🚀 Comandos Rápidos para Verificar

```bash
# 1. Ver configuración de somnus
cat /etc/nginx/sites-available/somnus

# 2. Verificar enlace
ls -la /etc/nginx/sites-enabled/somnus

# 3. Verificar sintaxis
nginx -t

# 4. Ver estado de Nginx
systemctl status nginx

# 5. Ver logs si hay errores
tail -20 /var/log/nginx/error.log

# 6. Ver qué usa puerto 80
sudo ss -tlnp | grep :80
```

---

## 💡 Recomendación

Si tienes múltiples sitios:

1. **Deja Apache corriendo** si otros sitios lo necesitan
2. **Configura Nginx** para que maneje solo `somnus.live`
3. **Asegúrate** de que la configuración de Nginx tiene `server_name somnus.live www.somnus.live`
4. **Nginx y Apache pueden coexistir** si usan diferentes puertos o diferentes dominios

---

## ✅ Checklist

- [ ] Configuración de somnus existe en `/etc/nginx/sites-available/somnus`
- [ ] Enlace simbólico existe en `/etc/nginx/sites-enabled/somnus`
- [ ] `nginx -t` pasa sin errores
- [ ] Nginx está corriendo (`systemctl status nginx`)
- [ ] Puerto 80 está siendo usado por Nginx o Apache (según tu configuración)
- [ ] App Next.js está corriendo en puerto 3000 (`pm2 status`)
- [ ] Sitio accesible desde navegador
