# 🚀 Inicio Rápido - Reutilización para Nuevo Cliente

## Resumen de 3 Pasos

### 1️⃣ Clonar y Configurar
```bash
# En tu servidor
git clone https://github.com/ytmness/boletera.git
cd boletera
npm install
cp .env.example .env
# Editar .env con tus valores
```

### 2️⃣ Personalizar Marca (3 cosas principales)

#### A. Reemplazar Logos
```bash
# Reemplaza estos archivos en public/assets/:
- logo-grupo-regia.png → tu-logo-principal.png
- rico-muerto-logo.png → tu-logo-secundario.png
```

#### B. Cambiar Colores
Edita `tailwind.config.ts` líneas 14-27:
```typescript
regia: {
  black: "#TU_COLOR_NEGRO",
  'gold-old': "#TU_COLOR_PRINCIPAL",
  cream: "#TU_COLOR_TEXTO",
  'metallic-gray': "#TU_COLOR_TARJETAS",
  'gold-bright': "#TU_COLOR_ACENTOS",
}
```

Edita `app/globals.css` líneas 31-35 con los mismos valores.

#### C. Cambiar Textos
```bash
# Opción 1: Script automático (Linux/Mac)
./scripts/customize-brand.sh "Tu Nombre" "Tu Marca Secundaria"

# Opción 2: Buscar y reemplazar manualmente
# Busca "Grupo Regia" y "Rico o Muerto" en todos los archivos .tsx y .ts
```

### 3️⃣ Construir y Desplegar
```bash
npm run build
pm2 start npm --name "boletera" -- start
# o
npm start
```

## 📋 Archivos Más Importantes

| Archivo | Qué Cambiar |
|---------|-------------|
| `public/assets/logo-grupo-regia.png` | Tu logo principal |
| `public/assets/rico-muerto-logo.png` | Tu logo secundario |
| `tailwind.config.ts` | Colores (líneas 14-27) |
| `app/globals.css` | Variables CSS (líneas 31-35) |
| `app/layout.tsx` | Metadata (líneas 32-44) |
| `app/page.tsx` | Textos del homepage |
| `.env` | Variables de entorno |

## 🔍 Búsqueda Rápida de Textos

```bash
# Encontrar todas las referencias
grep -r "Grupo Regia" app/ components/ lib/
grep -r "Rico o Muerto" app/ components/ lib/
```

## ⚡ Comandos Útiles

```bash
# Limpiar y reconstruir
rm -rf .next
npm run build

# Ver qué archivos tienen "Grupo Regia"
grep -r "Grupo Regia" --include="*.tsx" --include="*.ts" .

# Actualizar desde GitHub
git pull origin main
rm -rf .next
npm run build
pm2 restart boletera
```

## 📚 Guías Completas

- `CUSTOMIZATION_GUIDE.md` - Guía detallada de personalización
- `CLONACION_SERVIDOR.md` - Pasos completos para servidor

## ⚠️ Checklist Mínimo

- [ ] Logos reemplazados
- [ ] Colores actualizados (2 archivos)
- [ ] Textos principales cambiados
- [ ] `.env` configurado
- [ ] Build exitoso

¡Listo! 🎉
