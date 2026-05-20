GitFusion v22 - Session 15-8 - Learning Memory Reward

Foco desta sessão:
- Sistema de aprendizado real para o Brain Core.
- Memória forte por repetição.
- Ranking de padrões por score/confiança.
- Registro de decisões.
- Eventos de recompensa/erro em JSONL.
- Sugestões automáticas baseadas em padrões que já funcionaram.
- Dataset contínuo preservado em training/datasets.

Novos arquivos:
- server/brain/learningMemory.js
- scripts/brain-learning-selftest.js

Novas rotas:
- GET  /api/brain/learning/summary
- GET  /api/brain/learning/events
- POST /api/brain/learning/suggest
- POST /api/brain/learning/event

Novo comando de teste:
- npm run brain:learning-selftest

Armazenamento real:
- data/brain-learning/patterns.json
- data/brain-learning/events.jsonl
- data/brain-learning/decisions.jsonl
- training/datasets/gitfusion-YYYY-MM-DD.jsonl

Como usar no Termux:
cd ~/GitFusion
npm start

Em outro terminal ou depois com o servidor rodando:
npm run brain:learning-selftest
