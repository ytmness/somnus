# 🔄 Comandos Git para el Servidor

## 📋 Comandos Básicos

### Verificar estado del repositorio
```bash
cd /var/www/somnus
git status
```

### Verificar remoto configurado
```bash
git remote -v
```

Debería mostrar algo como:
```
origin  https://github.com/ytmness/somnus.git (fetch)
origin  https://github.com/ytmness/somnus.git (push)
```

---

## 🔄 Actualizar Código desde GitHub

### Método 1: Pull directo (si ya está configurado)
```bash
cd /var/www/somnus
git pull origin main
```

### Método 2: Si el remoto no está configurado
```bash
cd /var/www/somnus

# Verificar si es un repositorio git
git status

# Si no es un repo git, clonar desde cero:
cd /var/www
rm -rf somnus  # Solo si quieres empezar de cero
git clone https://github.com/ytmness/somnus.git
cd somnus
```

### Método 3: Configurar remoto manualmente
```bash
cd /var/www/somnus

# Agregar remoto si no existe
git remote add origin https://github.com/ytmness/somnus.git

# O actualizar remoto existente
git remote set-url origin https://github.com/ytmness/somnus.git

# Verificar
git remote -v

# Hacer pull
git pull origin main
```

---

## 🚀 Comandos Completos de Actualización

```bash
# 1. Ir al directorio
cd /var/www/somnus

# 2. Actualizar código desde GitHub
git pull origin main

# 3. Limpiar build anterior
rm -rf .next

# 4. Rebuild
npm run build

# 5. Reiniciar aplicación
pm2 restart somnus

# 6. Ver logs (opcional)
pm2 logs somnus
```

---

## 🔍 Troubleshooting

### Error: "not a git repository"
```bash
cd /var/www/somnus
git init
git remote add origin https://github.com/ytmness/somnus.git
git fetch origin
git checkout -b main origin/main
```

### Error: "fatal: couldn't find remote ref main"
```bash
# Verificar qué ramas existen
git branch -a

# Si la rama se llama 'master' en lugar de 'main'
git pull origin master

# O cambiar a main
git checkout -b main
git pull origin main
```

### Error: "Permission denied"
```bash
# Verificar permisos
ls -la /var/www/somnus

# Si necesitas cambiar permisos (cuidado con esto)
chown -R root:root /var/www/somnus
```

### Error: "Your local changes would be overwritten"
```bash
# Ver qué archivos tienen cambios
git status

# Opción 1: Guardar cambios locales
git stash
git pull origin main
git stash pop

# Opción 2: Descartar cambios locales (CUIDADO: perderás cambios)
git reset --hard origin/main
git pull origin main
```

---

## 📝 Verificar Configuración Actual

```bash
cd /var/www/somnus

# Ver estado
git status

# Ver remotos configurados
git remote -v

# Ver rama actual
git branch

# Ver últimas commits
git log --oneline -5
```

---

## ✅ Checklist Antes de Pull

- [ ] Estás en el directorio correcto: `/var/www/somnus`
- [ ] El repositorio está inicializado: `git status` funciona
- [ ] El remoto está configurado: `git remote -v` muestra origin
- [ ] No hay cambios locales importantes (o están guardados con stash)
- [ ] El archivo `.env` está configurado correctamente
