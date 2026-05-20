GitFusion v22 Session 15-11 — Docker + APK build path real

Objetivo:
- Adicionar Docker ao projeto.
- Corrigir scripts do Capacitor para não depender de npx quebrado.
- Preparar caminho de APK no Termux e caminho alternativo por Docker.

Arquivos novos:
- Dockerfile
- Dockerfile.android
- docker-compose.yml
- docker-compose.android.yml
- .dockerignore
- scripts/capacitor-cli.js
- scripts/apk-sync.js
- scripts/termux-android-prepare.sh

Comandos Termux principais:
  cd ~/GitFusion
  npm config set registry https://registry.npmjs.org/
  npm install --prefer-offline --no-audit --no-fund
  npm run apk:install-capacitor
  npm run build
  npm run apk:init
  npm run apk:debug

Se faltar Java/Gradle:
  npm run apk:termux-prepare

Comandos Docker:
  docker compose up --build

Build APK via Docker, quando Docker estiver disponível:
  docker compose -f docker-compose.android.yml up --build

Resultado esperado do APK debug:
  android/app/build/outputs/apk/debug/app-debug.apk

Nota:
Docker não roda dentro do APK. Docker é ferramenta de ambiente/build. O APK precisa levar o app empacotado. Para servidor local dentro do Android, o caminho mais estável continua sendo Termux rodando o backend e APK/WebView acessando o endereço local.
