GitFusion v22 Session 16-8 - AI Pack Runtime Integration

Objetivo:
Integrar o GitFusion-AI-Pack enviado pelo usuário ao runtime APK-first.

Incluído:
- public/gitfusion-ai-pack/ com docs, dataset seed, índice e manifesto.
- Importação automática no primeiro uso do chat APK local.
- Indexação dos documentos do AI Pack no IndexedDB.
- Alimentação automática do MemPalace com docs, dataset e registro de modelos.
- Registro local em localStorage: gitfusion.aiPack.registry.v16.
- Nova API frontend: GitFusionAPKEngine.importBundledAIPack() e ensureBundledPackImported().
- Selftest: npm run ai-pack:runtime-selftest.

Comportamento esperado:
1. O APK abre.
2. O usuário manda uma mensagem no chat.
3. Antes de responder, o runtime verifica se o AI Pack embutido já foi importado.
4. Se não foi, importa docs/dataset, cria chunks, salva em MemPalace/RAG e só depois responde.
5. As respostas simbólicas/offline passam a usar o conteúdo do pacote como contexto.

Observação:
Este pacote enviado contém manifest/docs/dataset seed, mas ainda não contém arquivos GGUF reais em models/.
O registry já declara os modelos, mas o runtime nativo llama.cpp/GGUF ainda é etapa posterior.
