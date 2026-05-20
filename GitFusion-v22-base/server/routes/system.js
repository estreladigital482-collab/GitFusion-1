import { Router } from 'express';
import { config } from '../config.js';
import { aiStatus } from '../services/ai.js';

export const systemRouter = Router();

systemRouter.get('/health', async (req, res) => {
  res.json({ ok: true, version: '0.1.22', name: 'GitFusion', time: new Date().toISOString() });
});

systemRouter.get('/status', async (req, res) => {
  res.json({ ok: true, config: { port: config.port, terminalEnabled: config.terminalEnabled }, ai: await aiStatus() });
});
