GitFusion v22 Session 15-2 — Brain Expansion

Objetivo:
Expandir o Brain Core criado na Session 15-1 para ficar mais próximo do uso real no celular: programar, juntar projetos, estimar tempo, criar metas e trabalhar com modelos gratuitos.

Adicionado:
- server/brain/goalEngine.js
  Cria uma meta operacional com marcos, tempo total, perfil mobile e modo recomendado.

- server/brain/projectComposer.js
  Cria uma receita de fusão de projetos: projeto base, satélites, checkpoints, riscos e estratégia.

- server/brain/modelAdvisor.js
  Lista modelos gratuitos e leves sugeridos para Android/Termux, com arquitetura local-first.

- server/brain/brainProgress.js
  Salva progresso por run em data/brain/progress.

- /api/brain/mobile-models
  Retorna plano de modelos gratuitos/mobile.

- /api/brain/progress
  Lista progressos salvos.

- /api/brain/progress/:id
  Lê progresso de uma execução.

- /api/brain/goal
  Atalho para criar uma execução orientada por meta.

Scripts novos:
- npm run brain:models
- npm run brain:runs

Notas:
- Continua seguro para celular: não executa terminal destrutivo sozinho.
- O cérebro agora entende metas maiores e cria uma receita de fusão de projetos.
- O app continua rodando com npm start em Termux.
- APK ainda é etapa futura, depois que o Brain ficar estável.
