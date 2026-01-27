# Guía de Personalización - Boletera Multi-Cliente

Esta guía te ayudará a reutilizar la boletera para otro cliente cambiando textos, colores, logos y nombres de marca.

## 📋 Checklist de Personalización

### 1. **Archivos de Configuración**

#### `.env` o `.env.local`
```env
NEXT_PUBLIC_APP_NAME=Tu Nombre - Boletera
```

#### `app/layout.tsx` (líneas 32-44)
- Cambiar título: `"Boletera Regia - Grupo Regia"` → `"Tu Nombre - Tu Cliente"`
- Cambiar descripción
- Cambiar keywords
- Cambiar authors

### 2. **Colores y CSS**

#### `tailwind.config.ts` (líneas 14-27)
Cambiar la paleta de colores en `regia`:
```typescript
regia: {
  black: "#0A0A0A",           // Tu color negro
  'gold-old': "#C5A059",      // Tu color dorado/principal
  cream: "#E0E0E0",           // Tu color de texto
  'metallic-gray': "#2D2D2D", // Tu color de tarjetas
  'gold-bright': "#F4D03F",   // Tu color de acentos
}
```

#### `app/globals.css` (líneas 31-35)
Actualizar las variables CSS:
```css
--regia-black: #0A0A0A;
--regia-gold-old: #C5A059;
--regia-cream: #E0E0E0;
--regia-metallic-gray: #2D2D2D;
--regia-gold-bright: #F4D03F;
```

### 3. **Logos e Imágenes**

#### Reemplazar en `public/assets/`:
- `logo-grupo-regia.png` → Tu logo principal
- `rico-muerto-logo.png` → Tu logo secundario (opcional)
- `victor-mendivil-title.png` → Título del artista/evento principal
- `fecha-evento.png` → Fecha del evento
- `estrella.png` → Icono de scroll (opcional)
- `porque-grupo-regia-titulo.png` → Título de sección "¿Por qué...?"
- `info-evento-titulo.png` → Título "Información del Evento"
- `tipos-de-boletos-titulo.png` → Título "Tipos de Boletos"
- `mas-eventos-titulo.png` → Título "Más Eventos"

### 4. **Textos Hardcodeados**

#### `app/page.tsx`
- Línea 395, 410, 414: `alt="Grupo Regia"` → Tu nombre
- Línea 481, 485: `alt="Rico o Muerto"` → Tu logo secundario
- Línea 838: `alt="¿Por qué Grupo Regia?"` → Tu pregunta
- Línea 889: `GRUPO REGIA` → Tu nombre
- Línea 925: `RICO O MUERTO` → Tu marca secundaria
- Línea 933: `© ${new Date().getFullYear()} Grupo Regia...` → Tu copyright

#### `app/login/page.tsx`
- Línea 72, 88, 92: `alt="Grupo Regia"`
- Línea 159, 163: `alt="Rico o Muerto"`
- Línea 183: `Grupo Regia` en título

#### `app/register/page.tsx`
- Línea 81, 97, 101: `alt="Grupo Regia"`
- Línea 168, 172: `alt="Rico o Muerto"`
- Línea 192: `Grupo Regia` en título

#### `app/verificar-email/page.tsx`
- Línea 134, 150, 154: `alt="Grupo Regia"`
- Línea 221, 225: `alt="Rico o Muerto"`

#### `app/mis-boletos/page.tsx`
- Líneas 134, 144, 152, 179, 195, 199, 266, 270: Logos y alt texts

#### `app/eventos/[id]/mesas/page.tsx`
- Línea 318: `GRUPO REGIA`
- Línea 332: `RICO O MUERTO`
- Línea 336: Copyright

#### `app/layout.tsx`
- Líneas 32-35: Metadata (title, description, keywords, authors)

### 5. **Emails**

#### `lib/services/email.ts`
- Línea 53: `"Código de verificación - Grupo Regia"` → Tu nombre
- Línea 71: `<h1>Grupo Regia</h1>` → Tu nombre
- Línea 76: Texto del email
- Línea 82: Copyright en email
- Línea 89: Asunto del email plano

### 6. **PDFs de Boletos**

#### `lib/services/ticket-generator.ts`
- Línea 44: `pdf.text("GRUPO REGIA", ...)` → Tu nombre
- Línea 119: `pdf.text("✓ GRUPO REGIA", ...)` → Tu nombre

### 7. **Componentes**

#### `components/NavbarFooter.tsx`
- Línea 39: `alt="Rico o Muerto"`
- Línea 166: Descripción en metadata
- Línea 192: `alt="Rico o Muerto"`
- Línea 248: Copyright

### 8. **Base de Datos**

Si necesitas cambiar nombres en la BD, revisa:
- `prisma/schema.prisma` - Modelos
- Scripts SQL en `scripts/` - Datos iniciales

## 🚀 Proceso de Clonación y Personalización

### Paso 1: Clonar desde GitHub
```bash
git clone https://github.com/ytmness/boletera.git
cd boletera
```

### Paso 2: Instalar dependencias
```bash
npm install
```

### Paso 3: Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

### Paso 4: Personalizar marca
1. Reemplazar logos en `public/assets/`
2. Actualizar colores en `tailwind.config.ts` y `app/globals.css`
3. Buscar y reemplazar "Grupo Regia" y "Rico o Muerto" en todo el proyecto
4. Actualizar textos en emails y PDFs

### Paso 5: Buscar y reemplazar masivo
```bash
# En Linux/Mac
find . -type f -name "*.tsx" -o -name "*.ts" -o -name "*.md" | xargs sed -i 's/Grupo Regia/Tu Nombre/g'
find . -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/Rico o Muerto/Tu Marca Secundaria/g'

# En Windows PowerShell
Get-ChildItem -Recurse -Include *.tsx,*.ts,*.md | ForEach-Object { (Get-Content $_.FullName) -replace 'Grupo Regia','Tu Nombre' | Set-Content $_.FullName }
```

### Paso 6: Construir y probar
```bash
npm run build
npm run dev
```

## 📝 Archivos Clave a Revisar

1. **Configuración:**
   - `.env` / `.env.local`
   - `app/layout.tsx`
   - `tailwind.config.ts`
   - `app/globals.css`

2. **Páginas principales:**
   - `app/page.tsx` (Homepage)
   - `app/login/page.tsx`
   - `app/register/page.tsx`
   - `app/verificar-email/page.tsx`
   - `app/mis-boletos/page.tsx`

3. **Servicios:**
   - `lib/services/email.ts`
   - `lib/services/ticket-generator.ts`

4. **Assets:**
   - `public/assets/*.png` (todos los logos e imágenes)

## 🎨 Personalización de Colores

Para cambiar completamente la paleta de colores:

1. **Elige tu paleta** (ejemplo):
   - Primario: `#FF6B6B` (rojo)
   - Secundario: `#4ECDC4` (turquesa)
   - Texto: `#FFFFFF` (blanco)
   - Fondo: `#1A1A1A` (negro)
   - Acentos: `#FFD93D` (amarillo)

2. **Actualiza `tailwind.config.ts`:**
```typescript
regia: {
  black: "#1A1A1A",
  'gold-old': "#FF6B6B",      // Tu color primario
  cream: "#FFFFFF",
  'metallic-gray': "#2D2D2D",
  'gold-bright': "#FFD93D",   // Tu color de acentos
}
```

3. **Actualiza `app/globals.css`** con los mismos valores

4. **Busca y reemplaza** referencias específicas de color en el código si es necesario

## ✅ Checklist Final

- [ ] Logos reemplazados en `public/assets/`
- [ ] Colores actualizados en `tailwind.config.ts` y `globals.css`
- [ ] Textos "Grupo Regia" reemplazados
- [ ] Textos "Rico o Muerto" reemplazados
- [ ] Metadata en `layout.tsx` actualizada
- [ ] Emails personalizados
- [ ] PDFs de boletos personalizados
- [ ] Variables de entorno configuradas
- [ ] Pruebas en desarrollo
- [ ] Build exitoso

## 🔍 Búsqueda Rápida

Para encontrar todas las referencias:
```bash
# Buscar "Grupo Regia"
grep -r "Grupo Regia" --include="*.tsx" --include="*.ts" --include="*.md" .

# Buscar "Rico o Muerto"
grep -r "Rico o Muerto" --include="*.tsx" --include="*.ts" --include="*.md" .

# Buscar "regia" (clases CSS)
grep -r "regia-" --include="*.tsx" --include="*.ts" .
```

## 📞 Notas Adicionales

- Los nombres de clases CSS (`regia-*`) pueden mantenerse igual si solo cambias los colores
- Si cambias los nombres de clases, actualiza también `globals.css`
- Las imágenes de títulos pueden mantenerse si solo cambias el texto en ellas
- Revisa los comentarios en el código para referencias adicionales
