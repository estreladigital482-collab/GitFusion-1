# Sessão 11: Projetos mesclados + árvore VS Code avançada

Esta sessão melhora a área **Repositórios mesclados** sem alterar a sidebar/composer aprovados.

## Inclui

- Cards de projetos mesclados com ações rápidas.
- Explorador flutuante estilo VS Code.
- Árvore expansível de pastas e arquivos.
- Preview de arquivo dentro do app.
- Renomear projeto.
- Excluir projeto local.
- Exportar projeto em ZIP.
- Integração com Wiki por projeto.

## Rotas novas/ajustadas

- `GET /api/projects`
- `GET /api/projects/:projectId/tree`
- `GET /api/projects/:projectId/file?path=...`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`
- `GET /api/projects/:projectId/export`

## Segurança

O preview de arquivos usa proteção contra path traversal e limita arquivos muito grandes.
