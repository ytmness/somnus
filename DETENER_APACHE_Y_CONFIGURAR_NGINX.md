# 🔧 Detener Apache y Configurar Nginx

## ✅ Solución Paso a Paso

### Paso 1: Detener Apache

```bash
# Detener Apache
systemctl stop apache2

# Deshabilitar Apache para que no inicie al arrancar
systemctl disable apache2

# Verificar que está detenido
systemctl status apache2
```

### Paso 2: Verificar que el Puerto 80 está Libre

```bash
# Verificar que el puerto 80 está libre
sudo ss -tlnp | grep :80

# No debería mostrar nada de Apache
```

### Paso 3: Verificar Configuración de Nginx

```bash
# Verificar que la configuración existe
cat /etc/nginx/sites-available/somnus

# Verificar sintaxis
nginx -t
```

### Paso 4: Iniciar Nginx

```bash
# Iniciar Nginx
systemctl start nginx

# Verificar estado
systemctl status nginx

# Si hay errores, ver logs
tail -f /var/log/nginx/error.log
```

### Paso 5: Verificar que Funciona

```bash
# Verificar que Nginx está escuchando en puerto 80
sudo ss -tlnp | grep :80

# Debería mostrar nginx

# Probar localmente
curl http://localhost

# Debería mostrar contenido de tu app Next.js
```

---

## 🚀 Comandos Completos en Orden

```bash
# 1. Detener Apache
systemctl stop apache2
systemctl disable apache2

# 2. Verificar puerto 80
sudo ss -tlnp | grep :80

# 3. Verificar configuración Nginx
nginx -t

# 4. Iniciar Nginx
systemctl start nginx
systemctl status nginx

# 5. Verificar que funciona
sudo ss -tlnp | grep :80
curl http://localhost
```

---

## 🔍 Si Nginx Sigue Sin Iniciar

### Ver logs de error

```bash
# Ver logs de Nginx
tail -20 /var/log/nginx/error.log

# Ver logs del sistema
journalctl -xe | grep nginx
```

### Verificar configuración

```bash
# Verificar sintaxis
nginx -t

# Ver configuración completa
cat /etc/nginx/sites-available/somnus
```

### Verificar permisos

```bash
# Verificar permisos del archivo
ls -la /etc/nginx/sites-available/somnus
ls -la /etc/nginx/sites-enabled/somnus
```

---

## ✅ Checklist

- [ ] Apache detenido (`systemctl stop apache2`)
- [ ] Apache deshabilitado (`systemctl disable apache2`)
- [ ] Puerto 80 libre (verificado con `ss -tlnp | grep :80`)
- [ ] Configuración de Nginx correcta (`nginx -t` pasa)
- [ ] Nginx iniciado (`systemctl start nginx`)
- [ ] Nginx corriendo (`systemctl status nginx` muestra "active")
- [ ] Puerto 80 escuchando (`ss -tlnp | grep :80` muestra nginx)
- [ ] App accesible (`curl http://localhost` funciona)
