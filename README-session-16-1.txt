GitFusion v22 Session 16-1 — APK-first AI Runtime

Objetivo: tirar o GitFusion da fase de mockup e preparar o APK para operar sem servidor Termux aberto.

Implementado:
- public/apk-ai-runtime.js: motor client-side do APK.
- MemPalace local em localStorage.
- RAG lexical local usando memórias e mensagens do chat.
- AI Runtime Router no APK:
  1. auto
  2. online/openai-compatible
  3. offline/ollama
  4. embedded/simbólico
- Fallback honesto: se não houver LLM, o app não finge. Ele usa MemPalace/RAG/regras e informa o estado real.
- Progresso real por etapas no APK, atualizado durante a execução.
- Modo Auto/Online/Offline salvo localmente e funcionando mesmo sem API.
- Capacitor travado em 6.2.1 para build no Termux.
- capacitor.config.json com cleartext habilitado para localhost/Ollama.

Limites reais:
- Ollama não roda dentro do APK. O modo Ollama chama http://127.0.0.1:11434 quando existir.
- Modelo embarcado GGUF ainda precisa de integração nativa llama.cpp/llama.rn em etapa futura.
- O executor de arquivos dentro do APK ficará limitado ao armazenamento permitido pelo Android.

Build APK no Termux:
1. npm install --no-audit --no-fund
2. npm run build
3. rm -rf android
4. ./node_modules/.bin/cap add android
5. cd android
6. echo "sdk.dir=$HOME/android-sdk" > local.properties
7. printf "
android.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2
android.useAndroidX=true
" >> gradle.properties
8. ./gradlew assembleDebug

APK final esperado:
android/app/build/outputs/apk/debug/app-debug.apk
