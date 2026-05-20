import { Router } from 'express';
import { askAI, aiStatus, getAISettings, saveAISettings } from '../services/ai.js';

export const aiRouter = Router();

aiRouter.get('/status', async (req, res) => res.json({ ai: await aiStatus() }));
aiRouter.get('/settings', async (req, res) => {
  const settings = await getAISettings();
  res.json({ ...settings, token: settings.hasOnlineToken ? 'saved' : '' });
});
aiRouter.post('/settings', async (req, res) => res.json({ ok: true, settings: await saveAISettings(req.body || {}), ai: await aiStatus() }));
aiRouter.post('/chat', async (req, res) => {
  const response = await askAI(req.body.messages || [], req.body.context || {});
  res.json({ response });
});
