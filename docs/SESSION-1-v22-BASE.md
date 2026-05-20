# GitFusion Sessão 1: Base v22 limpa

Objetivo desta sessão: arrumar a casa sem destruir a UI aprovada.

## O que foi preparado

- Backend modular em `server/routes` e `server/services`.
- `.env` opcional com `dotenv` instalado.
- Armazenamento persistente em `data/`.
- Workspace de projetos em `workspaces/`.
- APIs base para projetos, memória, wiki, tasks e IA.
- Status do sistema e doctor script.

## Endpoints novos

- `GET /api/health`
- `GET /api/status`
- `POST /api/projects/start`
- `GET /api/projects`
- `GET /api/projects/:projectId/tree`
- `GET/POST /api/memory/:projectId`
- `GET/PUT /api/wiki/:projectId`
- `GET/POST/PATCH /api/tasks/:projectId`
- `GET /api/ai/status`
- `POST /api/ai/chat`

## Próxima sessão

Sessão 2: memória offline estilo Obsidian, com notas navegáveis, backlinks simples, tags e vinculação automática aos projetos.
