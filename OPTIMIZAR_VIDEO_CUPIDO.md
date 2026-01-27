# Optimizar Video Cupido para Autoplay en Móvil

## Problema
El video no se reproduce automáticamente en móvil porque el MP4 no tiene "fast start" (moov atom al inicio).

## Solución

### 1. Optimizar el video con faststart (sin recomprimir)

En tu servidor o PC con ffmpeg:

```bash
ffmpeg -i "actualizacionvisual/video 4k de cupido.mp4" -c copy -movflags +faststart "public/assets/cupido-angel-video.mp4"
```

Esto re-empaqueta el video moviendo los metadatos al inicio, permitiendo que iOS/Safari pueda empezar a reproducir inmediatamente.

### 2. Si el video es muy pesado (4K), optimizarlo también

Para reducir tamaño y mejorar carga en móvil:

```bash
# Versión optimizada para móvil (1080p, sin audio, faststart)
ffmpeg -i "actualizacionvisual/video 4k de cupido.mp4" \
  -vf "scale=1920:-2" \
  -c:v libx264 \
  -profile:v high \
  -level 4.1 \
  -preset medium \
  -crf 23 \
  -movflags +faststart \
  -an \
  "public/assets/cupido-angel-video.mp4"
```

### 3. Después de optimizar

```bash
cd c:\Users\sergi\Desktop\boletera-main\boletera-main
git add public/assets/cupido-angel-video.mp4
git commit -m "Optimizar video cupido con faststart para autoplay móvil"
git push origin main
git push somnus main
```

Luego en el servidor:
```bash
cd /var/www/somnus
git pull origin main
pm2 restart somnus --update-env
```

## Nota
El código ya está simplificado para evitar conflictos con iOS. El problema principal es el formato del video MP4.
