# Sessão 8, Workspace funcional + Modo Aprendizado

Esta sessão preserva a base visual restaurada da Sessão 6.3/7 e adiciona módulos isolados.

## Workspace funcional

- `GET /api/workspace/status`
- `GET /api/workspace/settings`
- `POST /api/workspace/settings`
- `POST /api/workspace/create`
- `POST /api/workspace/active`
- `DELETE /api/workspace/:id`
- `DELETE /api/workspace/tmp`

O app agora lista espaços, cria novos espaços, troca espaço ativo e remove espaços locais.

## Modo Aprendizado

Área nova na sidebar: **Aprendizado**.

Serve para colocar um link de repositório ou usar um projeto mesclado salvo. O GitFusion abre a árvore do código e explica arquivos como professor.

Endpoints:

- `GET /api/learning/sources`
- `POST /api/learning/sources`
- `DELETE /api/learning/sources/:id`
- `GET /api/learning/:id/tree`
- `GET /api/learning/:id/file?path=...`
- `POST /api/learning/:id/explain`

A explicação é local/heurística nesta primeira versão, sem depender de API online. Depois pode ser conectada ao LLM/RAG.
