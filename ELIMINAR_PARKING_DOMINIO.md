# 🔧 Eliminar Parking/Monetización del Dominio

## ❌ Problema

El dominio está redirigiendo a SearchHounds, lo que indica que está en modo "Parked" o "Monetización" en GoDaddy.

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar Estado del Dominio en GoDaddy

1. **Ve a tu cuenta de GoDaddy**
2. **Busca el dominio** `somnus.live`
3. **Ve a "Configuración" o "Settings"** del dominio
4. **Busca opciones como**:
   - "Domain Parking"
   - "Monetización"
   - "CashParking"
   - "Domain Forwarding"
   - "Redirects"

### Paso 2: Desactivar Parking/Monetización

1. **Desactiva cualquier servicio de parking**
2. **Desactiva monetización**
3. **Elimina cualquier redirección** configurada
4. **Guarda los cambios**

### Paso 3: Verificar Registros DNS

Asegúrate de que **SOLO** tengas estos registros A:

| Tipo | Nombre | Datos | Estado |
|------|--------|-------|--------|
| **A** | `@` | `144.202.72.150` | ✅ Debe existir |
| **A** | `www` | `144.202.72.150` | ✅ Debe existir |

**Elimina cualquier registro que tenga**:
- "Parked"
- "Forwarding"
- Cualquier IP que no sea `144.202.72.150`

### Paso 4: Verificar Configuración de Forwarding

En GoDaddy, busca:

1. **"Domain Forwarding"** o **"Redirects"**
2. **Verifica que NO haya forwarding activo**
3. **Si hay forwarding a SearchHounds o cualquier otro sitio, ELIMÍNALO**

---

## 🔍 Verificar en el Servidor

### Verificar que Nginx No Tiene Redirecciones

```bash
# Ver configuración de Nginx
cat /etc/nginx/sites-available/somnus

# Verificar que no hay redirects o rewrites
grep -i "redirect\|rewrite\|return" /etc/nginx/sites-available/somnus

# Ver logs de acceso
tail -20 /var/log/nginx/somnus-access.log
```

### Verificar que la App Está Corriendo

```bash
# Verificar PM2
pm2 status

# Verificar que responde en localhost:3000
curl http://localhost:3000

# Verificar que Nginx puede conectarse
curl http://localhost
```

---

## 🚨 Pasos Específicos en GoDaddy

### Opción 1: Desactivar CashParking (si está activo)

1. Ve a: **My Products** → **Domains** → `somnus.live`
2. Busca: **"CashParking"** o **"Monetización"**
3. Haz clic en **"Manage"** o **"Settings"**
4. **Desactiva** o **Elimina** el servicio
5. Guarda cambios

### Opción 2: Verificar Domain Forwarding

1. Ve a: **DNS Management** para `somnus.live`
2. Busca sección: **"Forwarding"** o **"Redirects"**
3. Si hay algún forwarding configurado, **ELIMÍNALO**
4. Guarda cambios

### Opción 3: Verificar Configuración de Nameservers

Asegúrate de que los nameservers sean los de GoDaddy:
- `ns47.domaincontrol.com`
- `ns48.domaincontrol.com`

**NO uses nameservers de terceros** que puedan tener parking activo.

---

## ⏱️ Después de Corregir

1. **Espera 10-15 minutos** para propagación DNS
2. **Limpia caché del navegador** completamente
3. **Prueba en modo incógnito**
4. **Prueba desde otro dispositivo/red** si es posible

---

## 🔍 Verificar DNS Limpio

```bash
# Desde el servidor
nslookup somnus.live

# Debería mostrar SOLO: 144.202.72.150
# NO debería mostrar ninguna IP de servicios de parking

# Verificar www también
nslookup www.somnus.live
```

---

## ✅ Checklist

- [ ] Parking/Monetización desactivado en GoDaddy
- [ ] Domain Forwarding eliminado
- [ ] Solo registros A con IP `144.202.72.150`
- [ ] Nameservers correctos (GoDaddy)
- [ ] Esperado 10-15 minutos para propagación
- [ ] Caché del navegador limpiada
- [ ] Probado en modo incógnito
- [ ] Sitio accesible sin redirecciones

---

## 📝 Nota Importante

Si después de hacer todos estos cambios aún redirige:

1. **Contacta a GoDaddy** - Puede haber una configuración oculta
2. **Verifica que el dominio no esté en "Domain Lock"** o protección
3. **Asegúrate de que el dominio esté completamente transferido** a tu cuenta

---

## 🚀 Comandos de Verificación en el Servidor

```bash
# Verificar que la app responde directamente
curl -I http://localhost:3000

# Verificar que Nginx funciona
curl -I http://localhost

# Ver logs de Nginx para ver qué está pasando
tail -50 /var/log/nginx/somnus-access.log | grep somnus.live
```
