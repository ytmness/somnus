# 🤖 Prompt para Cursor AI - Metodología Git Deploy

Copia y pega este prompt al inicio de tus sesiones con Cursor:

---

## 📋 PROMPT PARA CURSOR

```
METODOLOGÍA DE TRABAJO:

1. Edito código en LOCAL (mi PC)
2. Subes cambios a GITHUB (git push)
3. Despliego en SERVIDOR (git pull + rebuild)

PROYECTO:
- Repo: https://github.com/ytmness/boletera
- Server: root@216.128.139.41
- Dir: ~/boletera
- Stack: Next.js 14, Prisma, Supabase, PM2, Nginx
- Proceso PM2: "boletera"

INSTRUCCIONES:
✅ Edita archivos locales directamente
✅ Haz commit y push automáticamente después de editar
✅ Dame SOLO los comandos para ejecutar en el servidor
❌ NO edites archivos en el servidor con nano/vi
❌ NO hagas cambios manuales en el servidor

DESPUÉS DE TUS EDICIONES, MUÉSTRAME:
"✅ Cambios subidos a GitHub. En tu servidor ejecuta:

```bash
cd ~/boletera
git pull origin main
npm run build
pm2 restart boletera
```"

Si hay cambios en schema de Prisma, incluye:
```bash
npm run db:generate
npm run db:push
```

Si hay nuevas dependencias, incluye:
```bash
npm install --legacy-peer-deps
```

RESPONDE SIEMPRE EN ESPAÑOL
```

---

## 📌 Versión Corta (Para copiar rápido)

```
Metodología: LOCAL (editar) → GITHUB (push) → SERVIDOR (pull + build)

Repo: github.com/ytmness/boletera
Server: root@216.128.139.41:~/boletera  
Stack: Next.js 14, Prisma, PM2

Después de editar:
1. Push automático a GitHub
2. Dame comandos para servidor:
   - cd ~/boletera
   - git pull
   - npm run build
   - pm2 restart boletera

NO editar en servidor. TODO vía git.
```

---

## 🎯 Uso en Cursor

1. Abre Cursor
2. Presiona `Ctrl + L` (o `Cmd + L` en Mac) para abrir el chat
3. Pega el prompt al inicio de tu sesión
4. Cursor recordará esta metodología durante toda la conversación

---

## 💡 Tips Adicionales

- Guarda este prompt en un archivo `.cursorrules` en la raíz de tu proyecto
- Cursor lo leerá automáticamente en cada sesión
- Personaliza con tus propios datos (repo, servidor, etc.)

---

## 📄 Crear archivo .cursorrules

Crea un archivo `.cursorrules` en la raíz de tu proyecto con:

```
# Metodología de Desarrollo
- Editar código localmente
- Subir cambios a GitHub
- Desplegar en servidor con git pull

# Servidor
- IP: 216.128.139.41
- Usuario: root
- Directorio: ~/boletera
- Proceso PM2: boletera

# Comandos de despliegue
cd ~/boletera && git pull origin main && npm run build && pm2 restart boletera

# NO editar archivos directamente en el servidor
# TODO cambio de código debe venir de git
```

Cursor leerá este archivo automáticamente y seguirá estas reglas sin necesidad de recordárselo cada vez.


