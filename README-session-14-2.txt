GitFusion v22 Session 14.2

Adicionado:
- config/model-library.json
- server/brain/modelLibrary.js
- server/brain/localModelRuntime.js
- server/brain/memPalace.js
- server/brain/ragBeforeAction.js
- server/brain/datasetGenerator.js
- server/brain/gitfusionAiLibrary.js
- server/routes/aiLibrary.js
- docs/GITFUSION-AI-LIBRARY.md
- training/README-LoRA-FUTURE.md

IMPORTANTE:
Para ativar a rota no backend, adicione no server/index.js:

import aiLibraryRouter from './routes/aiLibrary.js';
app.use('/api/ai-library', aiLibraryRouter);

Se a sessão anterior já tiver auto-loader de rotas, não precisa mudar nada.
