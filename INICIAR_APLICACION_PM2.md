# 🚀 Iniciar Aplicación con PM2

## ❌ Problema

- ✅ Nginx está corriendo correctamente
- ❌ La app Next.js no está corriendo en puerto 3000
- ❌ PM2 no está instalado o no está corriendo la app

---

## ✅ Solución

### Paso 1: Instalar PM2 (si no está instalado)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Verificar instalación
pm2 --version
```

### Paso 2: Ir al Directorio de la App

```bash
cd /var/www/somnus
```

### Paso 3: Iniciar la Aplicación con PM2

```bash
# Iniciar aplicación
pm2 start npm --name "somnus" -- start

# O si ya existe, reiniciarla
pm2 restart somnus

# Ver estado
pm2 status

# Ver logs
pm2 logs somnus --lines 20
```

### Paso 4: Configurar PM2 para Iniciar al Arrancar

```bash
# Guardar configuración actual de PM2
pm2 save

# Configurar PM2 para iniciar al arrancar el servidor
pm2 startup

# Seguir las instrucciones que aparezcan (copiar y ejecutar el comando que muestre)
```

### Paso 5: Verificar que la App Está Corriendo

```bash
# Ver estado
pm2 status

# Verificar que responde en puerto 3000
curl http://localhost:3000

# Verificar que Nginx puede conectarse
curl http://localhost
```

---

## 🔍 Troubleshooting

### Si PM2 no inicia la app

```bash
# Ver logs detallados
pm2 logs somnus --err

# Verificar que el build existe
ls -la .next

# Si no existe, hacer build
npm run build

# Intentar iniciar de nuevo
pm2 restart somnus
```

### Si el puerto 3000 está ocupado

```bash
# Ver qué está usando puerto 3000
sudo ss -tlnp | grep :3000

# Si hay otro proceso, detenerlo o cambiar el puerto en .env
```

### Si hay errores en los logs

```bash
# Ver todos los logs
pm2 logs somnus

# Ver solo errores
pm2 logs somnus --err

# Ver últimas 50 líneas
pm2 logs somnus --lines 50
```

---

## 🚀 Comandos Completos en Orden

```bash
# 1. Instalar PM2
npm install -g pm2

# 2. Ir al directorio
cd /var/www/somnus

# 3. Verificar que existe .next (build)
ls -la .next

# Si no existe:
npm run build

# 4. Iniciar con PM2
pm2 start npm --name "somnus" -- start

# 5. Ver estado
pm2 status

# 6. Ver logs
pm2 logs somnus --lines 20

# 7. Verificar que responde
curl http://localhost:3000

# 8. Verificar que Nginx funciona
curl http://localhost

# 9. Configurar para iniciar al arrancar
pm2 save
pm2 startup
```

---

## ✅ Checklist

- [ ] PM2 instalado (`pm2 --version`)
- [ ] Build existe (`.next` folder)
- [ ] App iniciada con PM2 (`pm2 status` muestra somnus)
- [ ] App responde en `http://localhost:3000`
- [ ] Nginx puede conectarse (`curl http://localhost` funciona)
- [ ] PM2 configurado para iniciar al arrancar (`pm2 startup`)

---

## 📝 Nota sobre Apache

Si necesitas Apache para otros sitios, puedes:

1. **Dejar Apache detenido** y usar solo Nginx para todos los sitios
2. **Configurar Apache en otro puerto** (8080) y usar Nginx en 80
3. **Usar Nginx como proxy principal** y configurar Apache para dominios específicos

Por ahora, deja Apache detenido hasta que somnus.live funcione correctamente.
