#!/usr/bin/env bash
#
# El perfil App Store debe ser un superconjunto de App.entitlements.
# Si Apple Pay aún no tiene merchant.live.somnus en el perfil, se quita
# esa clave para que el archive firme. Cuando el merchant esté asociado,
# este script no toca nada.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENTITLEMENTS="$ROOT/ios/App/App/App.entitlements"
MERCHANT="merchant.live.somnus"
PLIST_BUDDY="/usr/libexec/PlistBuddy"

if [ ! -f "$ENTITLEMENTS" ]; then
  echo "WARN: no existe $ENTITLEMENTS"
  exit 0
fi

shopt -s nullglob
profiles=(
  "$HOME/Library/MobileDevice/Provisioning Profiles/"*.mobileprovision
  "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles/"*.mobileprovision
)
shopt -u nullglob

if [ ${#profiles[@]} -eq 0 ]; then
  echo "WARN: no hay provisioning profiles instalados; se dejan entitlements"
  exit 0
fi

has_merchant=0
for profile in "${profiles[@]}"; do
  decoded="$(security cms -D -i "$profile" 2>/dev/null || true)"
  if printf '%s' "$decoded" | grep -q "$MERCHANT"; then
    has_merchant=1
    echo "OK: $MERCHANT está en $(basename "$profile")"
    break
  fi
done

if [ "$has_merchant" -eq 0 ]; then
  echo "ERROR: el perfil de firma no incluye $MERCHANT."
  echo "       Apple Pay quedará deshabilitado y el checkout mostrará tarjeta/Link."
  echo "       En Apple Developer: App ID live.somnus.app → Apple Pay → merchant.live.somnus"
  echo "       Luego refresca el perfil en Codemagic (Fetch profiles) y vuelve a compilar."
  "$PLIST_BUDDY" -c "Delete :com.apple.developer.in-app-payments" "$ENTITLEMENTS" 2>/dev/null || true
  plutil -lint "$ENTITLEMENTS"
  exit 0
else
  echo "OK: entitlements de Apple Pay se mantienen"
fi
