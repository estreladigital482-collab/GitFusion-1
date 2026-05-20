GitFusion v22 · Session 15-9 · Workspace Visual Real

Foco
- Etapa 1 da ordem definida pelo usuário: Workspace visual real.
- Transformar o workspace em uma área de IDE mobile: árvore de arquivos, editor textual, criação de arquivos/pastas e envio do arquivo para o Brain.

Backend real
- GET /api/workspace/tree
- GET /api/workspace/file?path=...
- POST /api/workspace/file
- POST /api/workspace/folder
- DELETE /api/workspace/path?path=...

Segurança
- Todos os caminhos são normalizados e bloqueados se tentarem sair de workspaces/<ativo>.
- Arquivos editados recebem backup em data/workspace-backups antes de sobrescrever.
- Exclusão move para data/workspace-trash em vez de apagar direto.

Interface
- Nova página: Workspace visual.
- Árvore de arquivos do espaço ativo.
- Editor mobile para arquivos textuais.
- Botões: Atualizar, Nova pasta, Novo arquivo, Salvar, Enviar para IA.

Teste
- Rode o servidor e depois: npm run workspace:ide-selftest
