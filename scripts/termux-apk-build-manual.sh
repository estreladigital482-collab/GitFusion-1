#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")/.."
echo "[GitFusion] Build web assets"
npm run build
if [ ! -d android ]; then
  echo "[GitFusion] Criando plataforma Android com Capacitor 6"
  ./node_modules/.bin/cap add android
fi
cd android
echo "sdk.dir=$HOME/android-sdk" > local.properties
if ! grep -q "android.aapt2FromMavenOverride" gradle.properties 2>/dev/null; then
  printf "\nandroid.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2\n" >> gradle.properties
fi
if ! grep -q "android.useAndroidX=true" gradle.properties 2>/dev/null; then
  printf "android.useAndroidX=true\n" >> gradle.properties
fi
./gradlew assembleDebug
mkdir -p /sdcard/Download
cp app/build/outputs/apk/debug/app-debug.apk /sdcard/Download/GitFusion-debug.apk
echo "[GitFusion] APK criado em /sdcard/Download/GitFusion-debug.apk"
