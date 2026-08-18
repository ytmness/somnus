# 🚀 Iniciar Aplicación con PM2 - Pasos Finales

## ✅ Estado Actual

- ✅ Build completado correctamente
- ✅ DNS resuelve a `144.202.72.150`
- ✅ Nginx está corriendo
- ❌ App NO está corriendo en puerto 3000

---

## 🚀 Solución: Instalar PM2 e Iniciar App

### Paso 1: Instalar PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Verificar instalación
pm2 --version
```

### Paso 2: Ir al Directorio

```bash
cd /var/www/somnus
```

### Paso 3: Iniciar la Aplicación

```bash
# Iniciar aplicación Next.js con PM2
pm2 start npm --name "somnus" -- start

# Ver estado
pm2 status

# Ver logs para verificar que inició correctamente
pm2 logs somnus --lines 30
```

### Paso 4: Verificar que Funciona

```bash
# Verificar que responde en puerto 3000
curl http://localhost:3000

# Debería mostrar HTML de tu aplicación

# Verificar que Nginx puede conectarse
curl http://localhost

# Debería mostrar el mismo contenido
```

### Paso 5: Configurar PM2 para Iniciar al Arrancar

```bash
# Guardar configuración actual
pm2 save

# Configurar para iniciar al arrancar el servidor
pm2 startup

# Ejecutar el comando que muestre (algo como):
# sudo env PATH=... pm2 startup systemd -u root --hp /root
```

---

## 🔍 Si PM2 Ya Está Instalado

Si PM2 ya está instalado pero la app no está corriendo:

```bash
# Ver todas las apps
pm2 list

# Si hay una app "somnus" pero está detenida
pm2 restart somnus

# Si no existe, crear nueva
pm2 start npm --name "somnus" -- start

# Ver logs
pm2 logs somnus
```

---

## 🐛 Troubleshooting

### Si la app no inicia

```bash
# Ver logs de errores
pm2 logs somnus --err

# Verificar que .env existe y está configurado
ls -la .env
cat .env | grep DATABASE_URL

# Verificar que el build existe
ls -la .next

# Si no existe, hacer build
npm run build
```

### Si el puerto 3000 está ocupado

```bash
# Ver qué está usando puerto 3000
sudo ss -tlnp | grep :3000

# Si hay otro proceso, detenerlo
pm2 delete all
pm2 start npm --name "somnus" -- start
```

### Si hay errores de base de datos

```bash
# Verificar .env tiene DIRECT_URL correcto
cat .env | grep DIRECT_URL

# Debe ser:
# DIRECT_URL=postgres://postgres.rbcqxxbddvbomwarmjvd:5S73wOjVjiSyRvFV@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Si no, corregirlo
nano .env
```

---

## ✅ Comandos Completos en Orden

```bash
# 1. Instalar PM2
npm install -g pm2

# 2. Ir al directorio
cd /var/www/somnus

# 3. Verificar que build existe
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

# 8. Verificar Nginx
curl http://localhost

# 9. Configurar para iniciar al arrancar
pm2 save
pm2 startup
```

---

## ✅ Checklist Final

- [ ] PM2 instalado (`pm2 --version`)
- [ ] App iniciada (`pm2 status` muestra somnus)
- [ ] App responde en `http://localhost:3000`
- [ ] Nginx puede conectarse (`curl http://localhost` funciona)
- [ ] DNS resuelve correctamente (`nslookup somnus.live`)
- [ ] Parking desactivado en GoDaddy
- [ ] Sitio accesible desde navegador

---

## 🌐 Probar en el Navegador

Después de que todo esté corriendo:

1. **Espera 5-10 minutos** después de desactivar parking en GoDaddy
2. **Limpia caché del navegador** completamente
3. **Abre**: `http://somnus.live`
4. **Debería cargar** tu aplicación Next.js directamente

---

## 📝 Nota sobre Parking

Si aún redirige a SearchHounds después de desactivar parking:

1. **Espera más tiempo** (hasta 30 minutos)
2. **Verifica en GoDaddy** que realmente se guardaron los cambios
3. **Prueba desde otro dispositivo/red** para evitar caché local
4. **Contacta soporte de GoDaddy** si persiste
