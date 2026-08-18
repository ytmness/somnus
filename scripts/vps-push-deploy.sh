#!/bin/bash
set -e
cd /var/www/somnus
git commit -m "unificado: coordinador agentes, ESLint, auth redirects y verify script"
git push origin main
export NODE_OPTIONS="--max-old-space-size=4096"
rm -rf .next
npm run build
pm2 restart somnus
git log --oneline -2
