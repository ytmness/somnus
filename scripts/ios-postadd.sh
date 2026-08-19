#!/usr/bin/env bash
#
# Aplica el overlay versionado de ios-config/ sobre el proyecto Xcode que
# `npx cap add ios` genera en el runner macOS de Codemagic.
#
# El proyecto nativo NO se versiona (ver .gitignore): este script es la unica
# fuente de verdad de la configuracion iOS y debe ser idempotente.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_APP_DIR="$ROOT/ios/App"
INFO_PLIST="$IOS_APP_DIR/App/Info.plist"
ENTITLEMENTS_SRC="$ROOT/ios-config/App.entitlements"
ENTITLEMENTS_DEST="$IOS_APP_DIR/App/App.entitlements"
PATCH_PLIST="$ROOT/ios-config/Info.plist.patch.plist"
PLIST_BUDDY="/usr/libexec/PlistBuddy"

if [ ! -f "$INFO_PLIST" ]; then
  echo "ERROR: no existe $INFO_PLIST. Ejecuta 'npx cap add ios' antes." >&2
  exit 1
fi

echo "==> Fusionando ios-config/Info.plist.patch.plist en Info.plist"
# PlistBuddy Merge no sobreescribe claves existentes, asi que borramos primero
# las que el template de Capacitor ya trae. Mantener sincronizado con el patch.
for key in \
  NSCameraUsageDescription \
  NSPhotoLibraryAddUsageDescription \
  ITSAppUsesNonExemptEncryption \
  UIViewControllerBasedStatusBarAppearance \
  UIStatusBarStyle \
  UIRequiresFullScreen \
  UISupportedInterfaceOrientations \
  CFBundleDisplayName \
  CFBundleURLTypes
do
  "$PLIST_BUDDY" -c "Delete :$key" "$INFO_PLIST" 2>/dev/null || true
done

"$PLIST_BUDDY" -c "Merge $PATCH_PLIST" "$INFO_PLIST"
plutil -lint "$INFO_PLIST"

echo "==> Copiando App.entitlements"
cp "$ENTITLEMENTS_SRC" "$ENTITLEMENTS_DEST"
plutil -lint "$ENTITLEMENTS_DEST"

echo "==> Parcheando App.xcodeproj (bundle id, entitlements, deployment target)"
ruby "$ROOT/scripts/ios-project-patch.rb"

echo "==> Parcheando Stripe Apple Pay (getRootVC / amount)"
bash "$ROOT/scripts/ios-patch-stripe-apple-pay.sh"

echo "==> Overlay iOS aplicado"
