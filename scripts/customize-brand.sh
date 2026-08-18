#!/bin/bash

# Script de personalización rápida de marca
# Uso: ./scripts/customize-brand.sh "Tu Nombre" "Tu Marca Secundaria"

if [ $# -lt 2 ]; then
    echo "Uso: $0 \"Nombre Principal\" \"Marca Secundaria\""
    echo "Ejemplo: $0 \"Mi Empresa\" \"Mi Logo\""
    exit 1
fi

PRIMARY_NAME="$1"
SECONDARY_NAME="$2"

echo "🔧 Personalizando marca..."
echo "Nombre principal: $PRIMARY_NAME"
echo "Marca secundaria: $SECONDARY_NAME"

# Buscar y reemplazar en archivos TypeScript/TSX
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.md" \) ! -path "./node_modules/*" ! -path "./.next/*" ! -path "./.git/*" | while read file; do
    if [ -f "$file" ]; then
        # Reemplazar Grupo Regia
        sed -i.bak "s/Grupo Regia/$PRIMARY_NAME/g" "$file"
        # Reemplazar Rico o Muerto
        sed -i.bak "s/Rico o Muerto/$SECONDARY_NAME/g" "$file"
        # Reemplazar RICO O MUERTO
        sed -i.bak "s/RICO O MUERTO/$(echo $SECONDARY_NAME | tr '[:lower:]' '[:upper:]')/g" "$file"
        # Reemplazar GRUPO REGIA
        sed -i.bak "s/GRUPO REGIA/$(echo $PRIMARY_NAME | tr '[:lower:]' '[:upper:]')/g" "$file"
        # Limpiar backups
        rm -f "$file.bak"
    fi
done

echo "✅ Personalización completada!"
echo ""
echo "⚠️  IMPORTANTE: Revisa manualmente:"
echo "   1. Archivos .env y variables de entorno"
echo "   2. Logos en public/assets/"
echo "   3. Colores en tailwind.config.ts y app/globals.css"
echo "   4. Metadata en app/layout.tsx"
echo ""
echo "Luego ejecuta:"
echo "   npm run build"
