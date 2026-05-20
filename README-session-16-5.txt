GitFusion v22 Session 16-5 — Full AI Pack Installer

Objetivo:
- Parar de otimizar para leve.
- Preparar o GitFusion para baixar modelos grandes e pacotes offline igual jogo.
- Suportar Qwen Coder, DeepSeek Coder, TinyLlama, GGUF e Ollama.

Arquivos novos:
- public/ai-pack-registry.json
- public/apk-model-packs.js
- scripts/download-ai-packs-termux.sh
- scripts/model-pack-selftest.js

Fluxo:
1. APK instala leve.
2. Usuário abre Configurações > Pacotes IA.
3. App baixa/registra Qwen/DeepSeek/TinyLlama.
4. Em Termux, use npm run ai-packs:termux-download para baixar modelos em ~/GitFusion/models.
5. Ollama pode puxar os mesmos modelos por hf.co.

Limite honesto:
- O app agora baixa e registra os modelos grandes.
- Para inferência GGUF 100% dentro do APK ainda falta integrar runtime nativo llama.cpp/llama.rn.
- Enquanto isso, os modelos baixados podem ser usados por Ollama/llama.cpp externo ou por runtime nativo futuro.
