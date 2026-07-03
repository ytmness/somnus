#!/bin/bash
set -euo pipefail
cd /var/www/somnus
git add scripts/stripe-production-setup.sh scripts/finish-mx-setup.sh 2>/dev/null || true
if ! git diff --cached --quiet 2>/dev/null; then
  git commit -m "Fix validacion pais MX y script finish-mx-setup"
  git push origin main
fi
