# Instalar FFmpeg y Optimizar Video Cupido

## 1. Instalar FFmpeg en el servidor

```bash
# Actualizar paquetes
apt update

# Instalar ffmpeg
apt install -y ffmpeg

# Verificar instalación
ffmpeg -version
```

## 2. Optimizar el video con faststart

```bash
cd /var/www/somnus

# Si el video está en actualizacionvisual (ajustar ruta según donde esté)
# Primero verificar dónde está el video original
find . -name "*cupido*.mp4" -type f

# Una vez encontrado, optimizarlo (ejemplo si está en la raíz del proyecto)
ffmpeg -i "actualizacionvisual/video 4k de cupido.mp4" -c copy -movflags +faststart "public/assets/cupido-angel-video.mp4"

# O si ya está en public/assets, hacer backup y optimizar
cp public/assets/cupido-angel-video.mp4 public/assets/cupido-angel-video.backup.mp4
ffmpeg -i public/assets/cupido-angel-video.mp4 -c copy -movflags +faststart public/assets/cupido-angel-video-optimized.mp4
mv public/assets/cupido-angel-video-optimized.mp4 public/assets/cupido-angel-video.mp4
```

## 3. Si el video es muy pesado (opcional - reducir tamaño)

```bash
# Versión optimizada para móvil (1080p, sin audio, faststart)
ffmpeg -i public/assets/cupido-angel-video.mp4 \
  -vf "scale=1920:-2" \
  -c:v libx264 \
  -profile:v high \
  -level 4.1 \
  -preset medium \
  -crf 23 \
  -movflags +faststart \
  -an \
  public/assets/cupido-angel-video.mp4
```

## 4. Verificar que funciona

```bash
# Verificar que el video tiene faststart
ffprobe public/assets/cupido-angel-video.mp4 2>&1 | grep -i faststart

# Reiniciar la aplicación
pm2 restart somnus --update-env
```

## Nota
El comando `-c copy` reempaqueta sin recompresión (rápido). Si quieres reducir tamaño, usa el segundo comando que recompresa a 1080p.
