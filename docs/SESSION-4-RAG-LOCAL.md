# GitFusion v22 - Sessão 4: RAG local

Esta sessão adiciona busca local para o GitFusion, sem depender de cloud.

## O que foi criado

- Serviço `server/services/rag.js`
- Rotas `server/routes/rag.js`
- Integração com chat via `server/routes/model.js`
- Página `Busca` na sidebar
- Índice local em `data/rag/index.json`

## Fontes indexadas

- Projetos mesclados em `workspaces/`
- Memória local em `data/memory/`
- Wiki local em `data/wiki/`

## Como usar

1. Abra **Busca** na sidebar.
2. Toque em **Recriar índice**.
3. Pesquise por arquitetura, arquivos, decisões ou nomes de libs.
4. O chat passa a usar esse contexto local quando responder.

## Como funciona

A primeira versão usa busca offline por texto, com tokenização e ranking TF-IDF simplificado.
Foi desenhada assim para funcionar no Termux sem banco pesado, sem Python e sem GPU.

## Próxima evolução

- Embeddings locais opcionais.
- SQLite/FTS5 ou sqlite-vec quando o ambiente permitir.
- Reranking local.
- Ligação direta com tasks da IA.
