#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "Preparando ambiente Android no Termux..."
echo "Isso instala Java/Gradle quando disponíveis nos repositórios do Termux."

pkg update -y
pkg install -y openjdk-17 gradle git unzip zip

cat <<'MSG'

Base instalada.
Agora rode:
  npm config set registry https://registry.npmjs.org/
  npm run apk:install-capacitor
  npm run build
  npm run apk:init
  npm run apk:debug

Observação: se o Gradle pedir Android SDK, o build direto no Termux pode precisar de sdkmanager/commandline-tools ou GitHub Actions.
MSG
