#!/bin/bash
# Script para verificar y forzar actualización completa en el servidor

echo "═══════════════════════════════════════════════════════════════"
echo "  VERIFICACIÓN Y ACTUALIZACIÓN COMPLETA DEL SERVIDOR"
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd /var/www/somnus

echo "1. Verificando último commit en servidor..."
git log -1 --oneline
echo ""

echo "2. Verificando cambios pendientes..."
git status
echo ""

echo "3. Haciendo pull de cambios..."
git fetch origin
git pull origin main
echo ""

echo "4. Verificando que los archivos tienen los cambios..."
echo "Buscando 'SOMNUS' en page.tsx:"
grep -n "somnus-title" app/page.tsx | head -3
echo ""

echo "Buscando 'BRAND IDENTITY' en page.tsx:"
grep -n "BRAND IDENTITY" app/page.tsx | head -3
echo ""

echo "5. Limpiando build anterior..."
rm -rf .next
echo ""

echo "6. Reconstruyendo aplicación..."
npm run build
echo ""

echo "7. Reiniciando PM2..."
pm2 restart somnus
echo ""

echo "8. Esperando 3 segundos..."
sleep 3
echo ""

echo "9. Verificando estado de PM2..."
pm2 status
echo ""

echo "10. Mostrando últimas líneas de logs..."
pm2 logs somnus --lines 20 --nostream
echo ""

echo "11. Verificando que responde..."
curl -s http://localhost:3000 | grep -o "SOMNUS\|BRAND IDENTITY\|AWAKE IN A DREAM" | head -5
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  VERIFICACIÓN COMPLETA"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Si ves 'SOMNUS', 'BRAND IDENTITY' o 'AWAKE IN A DREAM' arriba,"
echo "los cambios están aplicados correctamente."
echo ""
echo "Si no aparecen, revisa los logs con: pm2 logs somnus"
echo ""
