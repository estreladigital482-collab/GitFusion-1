GitFusion v22 Session 16-4 - Bootstrap Download Manager APK-first

Objetivo:
- Transformar o APK em launcher inteligente: instala leve, abre, verifica pacotes essenciais, instala conhecimento local e prepara motores/modelos.

Implementado:
- public/apk-bootstrap.js
  - IndexedDB próprio para packages/files/logs.
  - Registry local /bootstrap-packages.json.
  - Instala pacotes built-in no primeiro uso.
  - Suporta pacote remoto por manifest JSON com assets de texto e verificação sha256.
  - Injeta pacotes instalados no MemPalace/RAG do GitFusionAPKEngine.
  - Overlay de instalação inicial com progresso real.

- public/bootstrap-packages.json
  - core-knowledge
  - apk-engine
  - termux-apk-notes

- public/sw.js
  - Cache básico do app shell para abrir offline depois do primeiro carregamento.

- UI/CSS
  - Overlay "Preparando GitFusion".

Limite honesto:
- Modelos GGUF grandes ainda precisam de pacote remoto real/hosting ou integração nativa posterior.
- Esta versão prepara o instalador, manifesto, cache, base local e injeção no RAG.

Termux:
cd ~/GitFusion
unzip -o /sdcard/Download/GitFusion-v22-session-16-4-bootstrap-download-manager.zip
npm install --no-audit --no-fund
npm run build
npm start

APK:
Depois de instalar esta versão, gere o APK como antes. O primeiro uso do APK instala os pacotes embutidos automaticamente.
