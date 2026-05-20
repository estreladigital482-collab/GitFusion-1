import { Router } from 'express';
import { buildRagIndex, ragContext, ragStatus, searchRag } from '../services/rag.js';

export const ragRouter = Router();

ragRouter.get('/status', async (req, res) => res.json(await ragStatus()));
ragRouter.post('/rebuild', async (req, res) => res.json(await buildRagIndex(req.body || {})));
ragRouter.get('/search', async (req, res) => {
  res.json(await searchRag(req.query.q || '', { projectId: req.query.projectId || '', limit: req.query.limit || 8 }));
});
ragRouter.post('/context', async (req, res) => {
  res.json(await ragContext(req.body.query || '', { projectId: req.body.projectId || '', limit: req.body.limit || 5 }));
});
