import { Router } from 'express';
import { askAI } from '../services/ai.js';
import { readJson, writeJson } from '../services/store.js';
import { ragContext } from '../services/rag.js';

export const modelRouter = Router();

modelRouter.post('/chat', async (req, res) => {
  const prompt = req.body.prompt || req.body.message || '';
  const context = req.body.context || {};
  const rag = await ragContext(prompt, { projectId: context.projectId || context.jobId || '', limit: 5 }).catch(()=>({context:''}));
  const messages = [
    { role: 'system', content: 'Você é o GitFusion. Ajude a juntar repositórios, explicar arquitetura, criar plano de fusão e usar contexto local.' },
    ...(rag.context ? [{ role: 'system', content: 'Contexto local/RAG:\n' + rag.context }] : []),
    { role: 'user', content: prompt }
  ];
  const response = await askAI(messages, { ...context, prompt });
  res.json({ answer: response.content, provider: response.provider, model: response.model || '', usedRag: response.usedRag || false, error: response.error || '', rag: rag.results || [] });
});

modelRouter.get('/memory', async (req, res) => res.json(await readJson('memory', 'global', { memory: '', updatedAt: null })));
modelRouter.post('/memory', async (req, res) => res.json(await writeJson('memory', 'global', { memory: req.body.memory || '', updatedAt: new Date().toISOString() })));
modelRouter.get('/dataset', async (req, res) => {
  const rag = await readJson('rag', 'index', { docs: [] });
  res.json({ dataset: (rag.docs || []).map(d => ({ input: d.title + '\n' + d.path, output: d.text, sourceType: d.sourceType })) });
});
