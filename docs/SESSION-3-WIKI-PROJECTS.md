# Sessão 3 — Wiki por projeto

Esta sessão adiciona uma wiki real para cada projeto mesclado.

## Recursos

- Páginas Markdown por projeto em `data/wiki/<projectId>/pages/`.
- Geração automática de páginas iniciais.
- Páginas: Home, Arquitetura, Repositórios, Arquivos principais e Decisões.
- Busca dentro da wiki.
- Editor simples dentro do app.
- Histórico local de alterações.
- Integração com projetos salvos.

## Endpoints

- `GET /api/wiki/:projectId`
- `POST /api/wiki/:projectId/generate`
- `GET /api/wiki/:projectId/pages`
- `POST /api/wiki/:projectId/pages`
- `GET /api/wiki/:projectId/pages/:slug`
- `PUT /api/wiki/:projectId/pages/:slug`
- `DELETE /api/wiki/:projectId/pages/:slug`
- `GET /api/wiki/:projectId/search?q=texto`
