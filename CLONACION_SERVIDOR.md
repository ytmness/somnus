# Guía de Clonación en Servidor

## Pasos para clonar y configurar en un nuevo servidor

### 1. Conectar al servidor
```bash
ssh usuario@tu-servidor.com
```

### 2. Clonar el repositorio
```bash
cd ~
git clone https://github.com/ytmness/boletera.git
cd boletera
```

### 3. Instalar dependencias
```bash
npm install
```

### 4. Configurar variables de entorno
```bash
cp .env.example .env
nano .env  # o usa tu editor preferido
```

Configura estas variables importantes:
```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/boletera"

# NextAuth
NEXTAUTH_SECRET="tu-secret-key-aqui"
NEXTAUTH_URL="https://tu-dominio.com"

# Supabase (si usas)
NEXT_PUBLIC_SUPABASE_URL="tu-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-key"

# Nombre de la aplicación
NEXT_PUBLIC_APP_NAME="Tu Nombre - Boletera"
```

### 5. Configurar base de datos
```bash
# Ejecutar migraciones
npx prisma migrate deploy

# (Opcional) Seed inicial
npx prisma db seed
```

### 6. Construir la aplicación
```bash
npm run build
```

### 7. Configurar PM2 (si usas)
```bash
pm2 start npm --name "boletera" -- start
pm2 save
pm2 startup
```

### 8. Configurar Nginx (ejemplo)
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 9. Personalizar para el nuevo cliente

Antes de hacer el build final, sigue la guía `CUSTOMIZATION_GUIDE.md`:

1. Reemplazar logos
2. Cambiar colores
3. Actualizar textos
4. Configurar dominio

### 10. Reconstruir después de personalizar
```bash
rm -rf .next
npm run build
pm2 restart boletera
```

## Comandos útiles

```bash
# Ver logs
pm2 logs boletera

# Reiniciar
pm2 restart boletera

# Ver estado
pm2 status

# Actualizar desde GitHub
git pull origin main
rm -rf .next
npm run build
pm2 restart boletera
```

## Estructura de directorios importante

```
boletera/
├── app/              # Páginas y rutas
├── components/       # Componentes React
├── lib/              # Utilidades y servicios
├── public/           # Assets estáticos (logos, imágenes)
│   └── assets/       # ⚠️ IMPORTANTE: Reemplazar logos aquí
├── prisma/           # Schema de base de datos
├── scripts/          # Scripts SQL y utilidades
├── tailwind.config.ts # ⚠️ IMPORTANTE: Colores aquí
└── app/globals.css   # ⚠️ IMPORTANTE: Variables CSS aquí
```

## Notas de seguridad

1. **Nunca** subas `.env` al repositorio
2. Usa variables de entorno del servidor cuando sea posible
3. Configura HTTPS con Let's Encrypt
4. Mantén las dependencias actualizadas: `npm audit`

## Troubleshooting

### Error de build
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Error de base de datos
```bash
npx prisma generate
npx prisma migrate deploy
```

### Puerto en uso
```bash
# Cambiar puerto en .env o package.json
PORT=3001 npm start
```
