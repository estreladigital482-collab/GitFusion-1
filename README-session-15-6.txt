GitFusion v22 · Session 15-6 · Mobile Local AI Runtime

Foco desta sessão:
- Etapa 3 da ordem definida pelo usuário: IA local real no celular.
- Nada aqui baixa modelo automaticamente ou finge execução.
- O GitFusion agora detecta ambiente Termux/Android, binários disponíveis, Ollama API, modelos instalados e capacidade aproximada do aparelho.

Novos módulos:
- server/brain/mobileLocalRuntime.js

Novas rotas:
- GET  /api/brain/local/status
- GET  /api/brain/local/setup
- GET  /api/brain/local/probe
- POST /api/brain/local/choose
- POST /api/brain/local/generate

Novos scripts:
- npm run brain:local-status
- npm run brain:local-setup
- npm run brain:local-generate -- "seu prompt"

Funcionamento real:
1. Se Ollama estiver acessível e houver modelo instalado, GitFusion usa o modelo local.
2. Se não houver modelo, o Brain usa modo offline-symbolic-rag-safe sem inventar que rodou LLM.
3. O status mostra exatamente se há Ollama, llama-cli, git, node, RAM aproximada e modelos instalados.
4. O planejamento recomenda modelos de acordo com o aparelho.

Próxima etapa na ordem do usuário:
5. Sistema de projetos inteligente.
