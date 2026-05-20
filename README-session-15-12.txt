GitFusion v22 — Session 15.12 — Real Chat Engine + Onboarding + APK Termux Fix

Correções principais:
- O APK agora aponta para o motor real no Termux quando roda em Capacitor: http://127.0.0.1:3737.
- Adicionado onboarding inicial: nome do usuário + escolha de tema.
- Nome e tema continuam alteráveis nas configurações.
- O botão Auto/Online/Offline no topo agora alterna o modo real do backend.
- Chat não chama mais o fluxo simbólico/autonomous como resposta principal.
- Nova rota real: POST /api/brain/chat/start.
- Nova rota de progresso: GET /api/brain/chat/:id.
- Barra de progresso agora acompanha etapas reais do backend por polling.
- Quando não existe IA online/local configurada, o GitFusion informa claramente, sem fingir LLM.
- Mantido fallback operacional: plano, tasks, RAG/memória e executor seguro.
- Capacitor travado em 6.2.1 para build mais compatível no Termux.
- Incluído resources/icon.png com a nova logo enviada.

Fluxo correto no celular:
1. Rodar o servidor no Termux:
   cd ~/GitFusion
   npm start

2. Abrir o APK instalado.
   O APK usa o servidor Termux local como motor.

3. Para gerar APK novamente no Termux:
   cd ~/GitFusion
   npm install --no-audit --no-fund
   npm run build
   ./node_modules/.bin/cap add android
   cd android
   echo "sdk.dir=$HOME/android-sdk" > local.properties
   printf "\nandroid.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2\nandroid.useAndroidX=true\n" >> gradle.properties
   ./gradlew assembleDebug

Observação:
Este APK não embute Node.js. Ele é a interface Android. O motor real fica no Termux em 127.0.0.1:3737.
