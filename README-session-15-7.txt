GitFusion v22 Session 15-7 — Sistema de Projetos Inteligente

Objetivo
- Transformar projetos em espaços reais e isolados, não apenas pastas visuais.

Adicionado
- server/services/projectHub.js
- Rotas reais:
  POST /api/projects/smart
  GET  /api/projects/:projectId/dashboard
  POST /api/projects/:projectId/ensure
  GET  /api/projects/:projectId/chats
  POST /api/projects/:projectId/chats
  POST /api/projects/:projectId/chats/:chatId/messages
  POST /api/projects/:projectId/tasks/bootstrap
- Chats persistentes por projeto.
- Memória isolada por projeto.
- Wiki isolada por projeto.
- Tasks isoladas por projeto.
- Eventos do projeto.
- Dashboard consolidado do projeto.
- Selftest: npm run project:hub-selftest

Fluxo real
1. Criar projeto inteligente.
2. Criar chat dentro do projeto.
3. Salvar mensagens do chat.
4. Registrar memória do projeto.
5. Consultar dashboard com chats, tasks, wiki, memória e eventos.

Próxima etapa da ordem do Toby
4. Sistema de aprendizado.
