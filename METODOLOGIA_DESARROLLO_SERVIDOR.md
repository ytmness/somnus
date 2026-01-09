# 🚀 Metodología de Desarrollo con Servidor Remoto

## 📋 Flujo de Trabajo Eficiente

Esta metodología permite editar código localmente y desplegarlo en el servidor de manera rápida y segura.

---

## 🔄 Proceso de Desarrollo y Despliegue

### 1️⃣ **EDITAR EN LOCAL** (Tu PC)
```bash
# Hacer cambios en el código
# Cursor/VSCode edita los archivos necesarios
```

### 2️⃣ **SUBIR A GITHUB** (Repositorio central)
```bash
# Agregar cambios al staging
git add .

# Hacer commit con mensaje descriptivo
git commit -m "Descripción clara de los cambios"

# Subir a GitHub
git push origin main
```

### 3️⃣ **DESPLEGAR EN SERVIDOR** (VPS/Producción)
```bash
# Conectar al servidor
ssh root@[IP-SERVIDOR]

# Ir al directorio del proyecto
cd ~/boletera  # o la ruta de tu proyecto

# Obtener los cambios de GitHub
git pull origin main

# Si hay cambios en dependencias
npm install --legacy-peer-deps

# Si hay cambios en el schema de Prisma
npm run db:generate
npm run db:push

# Rebuild la aplicación
npm run build

# Reiniciar la aplicación
pm2 restart boletera

# Ver logs en tiempo real (opcional)
pm2 logs boletera
```

---

## 💡 Ventajas de esta Metodología

✅ **Seguridad**: GitHub actúa como respaldo de todo tu código  
✅ **Control de versiones**: Historial completo de cambios  
✅ **Reversibilidad**: Puedes volver a cualquier versión anterior  
✅ **Colaboración**: Múltiples desarrolladores pueden trabajar  
✅ **Testing local**: Pruebas antes de desplegar a producción  
✅ **Eficiencia**: No hay transferencia manual de archivos  

---

## 📝 Prompt para Cursor AI

Usa este prompt cuando trabajes con Cursor en proyectos con servidor remoto:

```
Estoy trabajando con la siguiente metodología de desarrollo:

1. EDITO el código en mi entorno LOCAL (Windows/Mac/Linux)
2. SUBO los cambios a GITHUB mediante git commit y push
3. DESPLIEGO en el SERVIDOR haciendo git pull y rebuild

Cuando necesites hacer cambios:
- Edita los archivos locales directamente
- Una vez completados los cambios, haz commit y push a GitHub
- Dame los comandos exactos para ejecutar en el servidor para desplegar los cambios

Información del proyecto:
- Repositorio: https://github.com/[USUARIO]/[REPO]
- Servidor: [IP o dominio]
- Directorio en servidor: ~/[DIRECTORIO]
- Stack: Next.js 14, Prisma, Supabase, PM2, Nginx
- Comando de build: npm run build
- Gestor de procesos: PM2 (nombre del proceso: "boletera")

Cuando hagas cambios:
1. Edita los archivos locales
2. Haz commit y push automáticamente
3. Dame SOLO los comandos para el servidor (sin repetir todo el contexto)

Ejemplo de lo que necesito después de tus ediciones:
"✅ Cambios subidos a GitHub. En tu servidor ejecuta:
```bash
cd ~/proyecto
git pull origin main
npm run build
pm2 restart app
```"

NO edites archivos directamente en el servidor.
NO uses nano/vi en el servidor para cambios de código.
SÍ usa git como única fuente de verdad.
```

---

## 🎯 Comandos Rápidos de Referencia

### En LOCAL:
```bash
# Ver estado de cambios
git status

# Ver diferencias
git diff

# Subir cambios
git add .
git commit -m "mensaje"
git push origin main
```

### En SERVIDOR:
```bash
# Conectar
ssh root@[IP]

# Actualizar código
cd ~/proyecto && git pull origin main

# Build completo (cuando hay cambios importantes)
npm install --legacy-peer-deps
npm run db:generate
npm run build
pm2 restart boletera

# Build rápido (solo cambios de código)
npm run build
pm2 restart boletera

# Ver logs
pm2 logs boletera

# Ver estado
pm2 status
```

---

## 🔧 Troubleshooting

### Si el servidor no refleja los cambios:
```bash
# 1. Verificar que git pull funcionó
git log -1

# 2. Limpiar cache de Next.js
rm -rf .next
npm run build

# 3. Reiniciar PM2
pm2 restart boletera

# 4. Ver errores en logs
pm2 logs boletera --err
```

### Si hay conflictos en git:
```bash
# En el servidor, descartar cambios locales
git reset --hard
git pull origin main
```

---

## 📊 Ejemplo de Flujo Completo

**Escenario**: Necesitas agregar una nueva API route

**LOCAL**:
```bash
# Cursor crea/edita: app/api/nueva-ruta/route.ts
# Cursor ejecuta automáticamente:
git add app/api/nueva-ruta/route.ts
git commit -m "Agregar nueva API route para [funcionalidad]"
git push origin main
```

**SERVIDOR**:
```bash
ssh root@tu-servidor
cd ~/proyecto
git pull origin main
npm run build
pm2 restart boletera
pm2 logs boletera
```

**VERIFICAR**:
```bash
# En tu navegador o con curl
curl http://tu-servidor/api/nueva-ruta
```

---

## ✅ Checklist de Despliegue

- [ ] Código editado localmente
- [ ] Cambios probados en desarrollo local
- [ ] Commit con mensaje descriptivo
- [ ] Push a GitHub exitoso
- [ ] Conectado al servidor
- [ ] Git pull ejecutado
- [ ] Dependencias instaladas (si es necesario)
- [ ] Build ejecutado sin errores
- [ ] PM2 reiniciado
- [ ] Logs verificados (sin errores)
- [ ] Aplicación funcionando en producción

---

## 🎓 Mejores Prácticas

1. **Commits frecuentes**: Haz commits pequeños y descriptivos
2. **Testing local primero**: Prueba en local antes de desplegar
3. **Revisar logs**: Siempre verifica los logs después de desplegar
4. **Backup de .env**: Ten respaldo de variables de entorno
5. **Monitoreo**: Usa `pm2 monit` para ver recursos en tiempo real
6. **SSL/HTTPS**: Configura certificados SSL para producción
7. **Nunca edites en servidor**: Todo cambio de código debe venir de git

---

## 🚨 Comandos de Emergencia

```bash
# Revertir al último commit en servidor
git reset --hard HEAD
git pull origin main
npm run build
pm2 restart boletera

# Ver qué procesos están usando un puerto
netstat -tlnp | grep 3000

# Matar un proceso específico
kill -9 [PID]

# Reiniciar todo PM2
pm2 restart all

# Ver uso de recursos
htop
```

---

**Fecha de creación**: Enero 2026  
**Stack**: Next.js 14 + Prisma + Supabase + PM2 + Nginx  
**Metodología**: Git-based deployment workflow

