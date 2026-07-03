#!/bin/bash
# Script para corregir problemas comunes en el servidor (Vultr)
# Ejecutar como root desde: cd /var/www/somnus && bash scripts/fix-server.sh

set -e

echo "=== Somnus - Corrección de servidor ==="

# 1. Sincronizar schema de BD (añade showQR si falta)
echo ""
echo "1. Aplicando cambios de schema a la base de datos..."
npx prisma db push

# 2. Regenerar cliente Prisma
echo ""
echo "2. Regenerando cliente Prisma..."
npx prisma generate

# 3. Rebuild
echo ""
echo "3. Reconstruyendo la aplicación..."
npm run build

# 4. Reiniciar PM2
echo ""
echo "4. Reiniciando PM2..."
pm2 restart somnus

echo ""
echo "=== Completado ==="
echo ""
echo "Si Clip sigue dando 'Unauthorized':"
echo "  - Verifica CLIP_AUTH_TOKEN en .env"
echo "  - pm2 restart somnus"
echo ""
