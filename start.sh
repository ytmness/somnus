NEXT_PUBLIC_APP_NAME=Somnus - Boletera
cd /var/www/somnus# Secrets QR_SECRET_KEY=somnus-qr-secret-2025-cambiar-en-produccion
JWT_SECRET=8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a
set -a source <(grep -v '^#' .env | grep -v '^$' | grep -v '^-') set +a
npm start EOF chmod +x /var/www/somnus/start.sh
pm2 start /var/www/somnus/start.sh --name "somnus"
pm2 save
sleep 5
pm2 logs somnus --lines 30 | grep -i "error\|fatal\|tenant\|ready"
