# 🔧 Corregir Registros DNS - Eliminar "Parked"

## ❌ Problema Detectado

Tienes **DOS registros A** para `@`:
1. ✅ `@` → `144.202.72.150` (CORRECTO - mantener)
2. ❌ `@` → `Parked` (INCORRECTO - eliminar)

El registro "Parked" está causando redirecciones no deseadas.

---

## ✅ Solución

### Paso 1: Eliminar Registro "Parked"

En tu panel de GoDaddy:

1. **Busca el registro A** que dice `Parked` en la columna "Datos"
2. **Haz clic en "Editar"** o **"Eliminar"**
3. **Elimina ese registro**
4. **Guarda los cambios**

### Paso 2: Verificar Registros Finales

Después de eliminar, deberías tener **SOLO** estos registros A:

| Tipo | Nombre | Datos | Acción |
|------|--------|-------|--------|
| **A** | `@` | `144.202.72.150` | ✅ Mantener |
| **A** | `www` | `144.202.72.150` | ✅ Mantener |

**NO debe haber ningún registro con "Parked"**

---

## 📋 Registros DNS Correctos Finales

Después de corregir, tus registros deberían verse así:

| Tipo | Nombre | Datos | TTL |
|------|--------|-------|-----|
| **A** | `@` | `144.202.72.150` | 600 segundos |
| **A** | `www` | `144.202.72.150` | 600 segundos |
| **NS** | `@` | `ns47.domaincontrol.com.` | 1 Hora |
| **NS** | `@` | `ns48.domaincontrol.com.` | 1 Hora |
| **CNAME** | `_domainconnect` | `_domainconnect.gd.domaincontrol.com.` | 1 Hora |
| **SOA** | `@` | `ns47.domaincontrol.com.` | 1 Hora |
| **TXT** | `_dmarc` | `v=DMARC1; p=quarantine; ...` | 1 Hora |

---

## ⏱️ Propagación DNS

Después de eliminar el registro "Parked":

1. **Espera 5-10 minutos** para que los cambios se propaguen
2. **Limpia la caché de DNS** en tu navegador:
   - Chrome/Edge: `Ctrl + Shift + Delete` → Limpiar caché
   - O prueba en modo incógnito
3. **Verifica desde el servidor**:
   ```bash
   nslookup somnus.live
   # Debería mostrar solo: 144.202.72.150
   ```

---

## 🔍 Verificar que Funciona

Después de eliminar "Parked" y esperar la propagación:

1. **Abre en navegador**: `http://somnus.live`
2. **Debería cargar** tu aplicación Next.js directamente
3. **NO debería redirigir** a `/lander` ni a ninguna página de parking

---

## 🚨 Si Aún Redirige a /lander

Si después de eliminar "Parked" aún redirige:

### Verificar en el Servidor

```bash
# Ver configuración de Nginx
cat /etc/nginx/sites-available/somnus

# Verificar que no hay redirecciones
grep -i "redirect\|rewrite" /etc/nginx/sites-available/somnus

# Ver logs de Nginx
tail -20 /var/log/nginx/somnus-access.log
tail -20 /var/log/nginx/somnus-error.log
```

### Verificar en Next.js

```bash
# Ver si hay middleware o redirecciones en el código
cd /var/www/somnus
grep -r "lander" app/
grep -r "redirect" app/
```

---

## ✅ Checklist

- [ ] Registro A "Parked" eliminado de GoDaddy
- [ ] Solo queda registro A `@` → `144.202.72.150`
- [ ] Registro A `www` → `144.202.72.150` existe
- [ ] Esperado 5-10 minutos para propagación DNS
- [ ] Caché del navegador limpiada
- [ ] Sitio accesible en `http://somnus.live`
- [ ] NO redirige a `/lander`

---

## 📝 Nota

El registro "Parked" es una característica de GoDaddy que muestra una página de "dominio en construcción" cuando el dominio no está configurado. Al eliminarlo y dejar solo el registro que apunta a tu servidor, el dominio debería funcionar correctamente.
