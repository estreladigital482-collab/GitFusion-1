GitFusion v22 · Session 15.1 · Brain Core + progresso mobile

Objetivo desta sessão
- Conectar o GitFusion AI Library ao app.
- Criar o primeiro Brain Core funcional para celular/Termux.
- Fazer o chat passar pelo cérebro antes de responder.
- Criar plano, estimativa de tempo, barra textual de progresso, tasks e memória operacional.

Novos arquivos
- server/routes/brain.js
- server/brain/brainCore.js
- server/brain/receptors.js
- server/brain/perception.js
- server/brain/planner.js
- server/brain/safety.js
- server/brain/executorBrain.js
- server/brain/reward.js
- server/brain/workingMemory.js
- server/brain/brainState.js

Rotas novas
- GET /api/brain/status
- GET /api/brain/runs
- GET /api/brain/runs/:id
- POST /api/brain/run

Rotas conectadas
- /api/brain
- /api/ai-library

Como funciona agora
1. O chat envia o pedido para /api/brain/run.
2. O Brain Core recebe o sinal.
3. Perception identifica intenção: código, debug, fusão de projetos, plano ou explicação.
4. RAG/MemPalace busca contexto antes de responder.
5. Planner cria etapas com tempo estimado.
6. Safety bloqueia execução automática perigosa.
7. Tasks são criadas no projeto.
8. Reward salva aprendizado no MemPalace e dataset JSONL.
9. O chat mostra progresso e resposta.

Importante
- Esta versão ainda não executa comandos de terminal sozinha por segurança.
- A execução automática futura pode ser ligada com GITFUSION_BRAIN_AUTORUN=true, mas deve continuar supervisionada no celular.
- Funciona grátis em modo internal/offline-symbolic quando não existe Ollama/modelo local.
- Se houver Ollama disponível, tenta usar modelos locais configurados em config/model-library.json.

Scripts
- npm start: roda o servidor.
- npm run build: valida e copia public/ para dist/ para preparação futura do APK.

Próxima sessão sugerida
Session 15.2: executor real supervisionado
- inspecionar workspace;
- propor patches;
- aplicar arquivos com autorização;
- progresso persistente por etapa;
- botão continuar/pausar;
- logs visuais no chat.
