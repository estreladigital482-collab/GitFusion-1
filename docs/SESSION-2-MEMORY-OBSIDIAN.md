# GitFusion Sessão 2: Memória offline estilo Obsidian

Objetivo: criar uma memória persistente local por projeto, baseada em arquivos Markdown, com links internos, tags, busca e grafo simples.

## Inspirações open source pesquisadas

- Logseq: conhecimento local, Markdown/org-mode e grafo de informações.
- Zettlr: workspace de arquivos Markdown, links internos e organização por pastas.
- Gnote/Tomboy: notas wiki-like com links automáticos.
- Ikiwiki: wiki armazenada como arquivos versionáveis.

## O que foi implementado

- Cofres locais em `data/memory/vaults/<projectId>/`.
- Cada nota é um `.md` real.
- Metadados no topo do Markdown.
- Tags com `#tag`.
- Links internos com `[[Nome da Nota]]`.
- Backlinks por nota.
- Grafo simples `{ nodes, edges }`.
- Busca textual offline.
- CRUD completo de notas.

## Endpoints

- `GET /api/memory/:projectId`
- `POST /api/memory/:projectId`
- `GET /api/memory/:projectId/search?q=texto`
- `GET /api/memory/:projectId/graph`
- `GET /api/memory/:projectId/export`
- `GET /api/memory/:projectId/:slug`
- `PUT /api/memory/:projectId/:slug`
- `DELETE /api/memory/:projectId/:slug`

## Exemplo de nota

```md
---
id: abc123
title: Decisões de arquitetura
tags: [arquitetura, fusao]
source: manual
createdAt: 2026-05-18T00:00:00.000Z
updatedAt: 2026-05-18T00:00:00.000Z
---
# Decisões de arquitetura

A base do projeto será [[Frontend Principal]].

#decisao #arquitetura
```

## Próxima sessão

Sessão 3: Wiki por projeto, usando essa memória como fonte de contexto.
