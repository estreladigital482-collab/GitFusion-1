GitFusion v22 Session 16-6 — AutoTrainer Self-Learning Pipeline

Objetivo
- Integrar ao 16-5 um pipeline de aprendizado comandado pelo usuário.
- O app pode receber comando como "estude X, baixe docs e gere dataset".
- Baixa fontes permitidas, limpa conteúdo, divide em chunks, injeta no MemPalace/RAG local e gera dataset JSONL para treino/LoRA futuro.

O que foi adicionado
- public/apk-autotrainer.js
- public/autotrainer-sources.json
- tela Configurações > AutoTrainer
- integração do chat com comandos de estudo/treino
- script npm run autotrainer:selftest
- script npm run autotrainer:termux-download

Limites reais
- Dentro do APK, downloads dependem de rede e permissões/CORS das fontes.
- Para baixar fontes sem CORS, use o Termux com npm run autotrainer:termux-download.
- Treino LoRA real ainda exige GPU/Colab/PC ou runtime nativo futuro.
- O aprendizado imediato é via RAG + MemPalace + dataset, não alteração direta dos pesos do modelo.

Comando Termux
cd ~/GitFusion
unzip -o /sdcard/Download/GitFusion-v22-session-16-6-autotrainer-self-learning.zip
npm install --no-audit --no-fund
npm run autotrainer:selftest
npm start
