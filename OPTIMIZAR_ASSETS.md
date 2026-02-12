# Optimizar assets (videos e imágenes) para Somnus

Para reducir tiempos de carga, comprime videos e imágenes con estas herramientas.

## Videos (ffmpeg)

Los videos actuales pesan 65–120 MB. Con ffmpeg puedes reducirlos ~80% sin perder calidad visual.

### 1. Instalar ffmpeg

**Windows:** `winget install ffmpeg`  
**Mac:** `brew install ffmpeg`

### 2. Optimizar un video individual

```bash
# Reemplaza NOMBRE_VIDEO.mp4 por tu archivo
ffmpeg -i "public/assets/NOMBRE_VIDEO.mp4" \
  -vf "scale=1920:-2" \
  -c:v libx264 \
  -profile:v high \
  -level 4.1 \
  -crf 26 \
  -preset slow \
  -movflags +faststart \
  -an \
  "public/assets/NOMBRE_VIDEO-optimized.mp4"
```

- `scale=1920:-2` → 1080p (máx 1920px ancho)
- `crf 26` → calidad (menor = mejor calidad, 23–28 suele ser adecuado)
- `-an` → sin audio (si no lo necesitas)
- `faststart` → metadatos al inicio para reproducción temprana

### 3. Optimizar todos los videos SOMNUS

```bash
cd somnus-main

# Crear backups y versiones optimizadas
for f in "SOMNUS VIVA BRUNCH 2.0.mp4" "SOMNUS 30-08-25 AFTERMOVIE 2.0.mp4" "SOMNYS BLACKOUTorBLACKOUT.mp4" "PANORAMA SOMNUSNIGHTS AFTERMOVIE 4.0.mp4"; do
  ffmpeg -i "public/assets/$f" \
    -vf "scale=1920:-2" \
    -c:v libx264 -profile:v high -level 4.1 \
    -crf 26 -preset slow -movflags +faststart -an \
    "public/assets/${f%.mp4}-opt.mp4"
done
```

Luego sustituye los originales por los `-opt.mp4` si el resultado es aceptable.

### 4. Versión muy ligera (móvil)

Para conexiones lentas:

```bash
ffmpeg -i "public/assets/VIDEO.mp4" \
  -vf "scale=1280:-2" \
  -c:v libx264 -profile:v main -level 4.0 \
  -crf 28 -preset fast -movflags +faststart -an \
  "public/assets/VIDEO-mobile.mp4"
```

## Imágenes (sharp, squoosh o online)

### JPG/PNG grandes

- **Squoosh (online):** https://squoosh.app  
- **Sharp (Node):**  
  `npx sharp-cli -i imagen.jpg -o imagen-opt.jpg -q 80`

### Galería – comprimir antes de subir

**Si las fotos tardan mucho en cargar**, las originales probablemente pesan 3–10 MB cada una. Comprímelas:

```bash
# Con ffmpeg – redimensionar a 1200px ancho, calidad 82
for f in public/assets/panorama-photo-download-1of1*/*/*.jpg; do
  ffmpeg -i "$f" -vf "scale=1200:-2" -q:v 5 "$f.tmp" && mv "$f.tmp" "$f"
done
```

O con **ImageMagick**: `mogrify -resize 1200x -quality 82 *.jpg`

Objetivo: **&lt; 500 KB** por imagen de galería.

## Cambios en el código ya aplicados

1. **Hero video:** `preload="metadata"` + poster para carga inicial rápida
2. **Hero video:** precarga del siguiente video al ~80% del actual
3. **Galería:** blur placeholder + lazy loading + optimización Next.js
4. **next.config:** formatos AVIF/WebP y tamaños optimizados para responsive
