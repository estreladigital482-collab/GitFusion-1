GitFusion v22 - Session 16-7
Correção de logo interna vs logo externa do APK

Objetivo:
- Restaurar as logos internas originais do GitFusion dentro do aplicativo.
- Manter a logo nova somente como ícone externo do APK/launcher.

Alterações:
- public/assets/gitfusion-icon-selected.png restaurado para o visual antigo.
- public/assets/icon-main.png restaurado para o visual antigo.
- public/assets/icon-main-clean.png restaurado para o visual antigo.
- public/favicon.png, apple-touch-icon e public/icons restaurados para o conjunto interno antigo.
- resources/icon.png mantido como logo externa do APK.
- resources/android-icons/ adicionado com ic_launcher.png e ic_launcher_round.png por densidade.
- npm run apk:icons agora copia os ícones externos para android/app/src/main/res/mipmap-*.
- npm run apk:init e npm run apk:sync aplicam os ícones automaticamente após Capacitor.

Comandos Termux:
cd ~/GitFusion
unzip -o /sdcard/Download/GitFusion-v22-session-16-7-launcher-logo-only.zip
npm install --no-audit --no-fund
npm run build
npm run apk:init
cd android
# se estiver no Termux, manter local.properties e gradle.properties como já fizemos antes
./gradlew assembleDebug

Observação:
- Esta versão não muda o motor, AutoTrainer, MemPalace, RAG ou pacotes de IA.
- O ajuste é cirúrgico: só separa logo interna e logo externa do APK.
