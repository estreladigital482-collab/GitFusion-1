import { Router } from 'express';
import { askAI, aiStatus } from '../services/ai.js';

export const aiRouter = Router();

aiRouter.get('/status', async (req, res) => res.json({ ai: await aiStatus() }));
aiRouter.post('/chat', async (req, res) => {
  const response = await askAI(req.body.messages || [], req.body.context || {});
  res.json({ response });
});
