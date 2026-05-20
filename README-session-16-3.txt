GitFusion v22 Session 16-3 — APK-first engine hardened

Objetivo
- Parar de tratar o APK como casca do servidor.
- Deixar o motor local do APK mais útil de verdade: MemPalace, RAG, base local, ações/tarefas e respostas baseadas no conteúdo importado.

O que foi reforçado
1. Motor APK local
- public/apk-ai-runtime.js agora expõe GitFusionAPKEngine com:
  - runChat
  - importFiles
  - searchKnowledge
  - knowledgeStats
  - exportKnowledge/importKnowledgeBackup
  - ensureProject
  - listProjects
  - addLocalTask
  - addDecision
  - localDiagnostics

2. Resposta offline mais útil
- Se houver arquivos importados, o chat responde usando trechos reais do índice local.
- Se não houver motor LLM, o app não finge IA completa.
- Mesmo sem internet, ele registra memória, cria tasks locais, decisões e plano verificável.

3. RAG conectado ao chat
- O chat consulta MemPalace + arquivos importados + histórico antes de responder.
- As fontes encontradas aparecem como base da resposta simbólica local.

4. Progresso real
- O runChat local dispara etapas progressivas:
  - receber mensagem
  - salvar no MemPalace
  - buscar RAG local
  - escolher runtime
  - criar tarefas/decisões
  - finalizar resposta

5. Runtimes suportados
- apk-symbolic: sempre funciona offline com MemPalace/RAG.
- ollama: tenta http://127.0.0.1:11434 quando disponível.
- online: tenta OpenAI-compatible quando configurado.
- embedded: reservado para etapa futura com GGUF/llama.cpp dentro do APK.

6. Teste local
- npm run apk:engine-selftest

Limitação honesta
- Um LLM totalmente embarcado no APK ainda não está incluído nesta versão.
- Para isso, a próxima etapa precisa integrar llama.cpp/gguf via camada nativa Android ou runtime JS/WASM viável.
- Mesmo assim, a 16-3 já trabalha offline com memória, RAG local, importação, planejamento, tasks e resposta baseada em arquivos importados.

Comandos Termux
cd ~/GitFusion
unzip -o /sdcard/Download/GitFusion-v22-session-16-3-apk-engine-hardening.zip
npm install --no-audit --no-fund
npm run apk:engine-selftest
npm start

Build APK no caminho que funcionou
- usar npm 10
- usar Capacitor 6.2.1
- usar openjdk-21
- usar SDK manual
- usar aapt2 do Termux
- gerar com ./gradlew assembleDebug
