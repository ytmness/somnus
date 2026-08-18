# Configurar Nginx para videos grandes

## Problema
Si el video 4K es muy grande, Nginx puede rechazar la solicitud por defecto.

## Solución

### 1. Editar configuración de Nginx

```bash
sudo nano /etc/nginx/sites-available/somnus
```

O si usas configuración por defecto:
```bash
sudo nano /etc/nginx/nginx.conf
```

### 2. Agregar dentro del bloque `server` o `http`:

```nginx
client_max_body_size 500M;  # Ajusta según el tamaño de tu video
```

### 3. Reiniciar Nginx

```bash
sudo nginx -t  # Verificar que la configuración es correcta
sudo systemctl restart nginx
```

### 4. Verificar que funciona

```bash
sudo systemctl status nginx
```

## Nota
- `client_max_body_size` limita el tamaño de archivos que Nginx acepta
- Para videos 4K, generalmente necesitas al menos 100M-500M
- Ajusta según el tamaño real de tu video
