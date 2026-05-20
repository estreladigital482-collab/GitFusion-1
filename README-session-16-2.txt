GitFusion v22 · Session 16-2 · APK-first Local Knowledge Importer

Objetivo:
Transformar a base APK-first em algo menos dependente de internet/servidor, adicionando importação local de conhecimento e RAG real no próprio aplicativo.

Implementado:
- IndexedDB local para base de conhecimento do APK.
- Importador de arquivos/pastas no app: Memória do projeto → Importar pasta/arquivos.
- Indexação offline em chunks.
- Busca local offline sobre arquivos importados.
- RAG do chat agora consulta:
  1. MemPalace local
  2. histórico de chats
  3. arquivos importados para IndexedDB
- Exportar/restaurar backup da base local.
- Configurações de motores no app:
  - Ollama URL/modelo
  - API online compatível com OpenAI
  - token/modelo
- Roteador APK-first:
  - auto
  - offline/Ollama
  - online
  - simbólico local honesto
- Script manual para build no Termux:
  npm run apk:termux-manual

Limitação honesta:
- LLM embutido GGUF dentro do APK ainda não está empacotado.
- Ollama continua sendo runtime externo/local quando usado.
- Sem LLM, o APK trabalha com MemPalace + RAG + planejamento simbólico, sem fingir inteligência gerativa completa.

Fluxo recomendado:
1. Instalar/abrir o APK.
2. Fazer onboarding.
3. Ir em Memória do projeto.
4. Importar pastas/docs/código.
5. Perguntar no chat sobre o conteúdo importado.
6. Configurar Ollama/API se quiser geração avançada.

