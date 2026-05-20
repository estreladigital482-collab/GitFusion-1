import { Router } from 'express';
import { connectivityStatus, getNetworkMode, setNetworkMode } from '../services/connectivity.js';

export const connectivityRouter = Router();

connectivityRouter.get('/status', async (req, res) => {
  res.json(await connectivityStatus());
});

connectivityRouter.get('/mode', async (req, res) => {
  res.json(await getNetworkMode());
});

connectivityRouter.post('/mode', async (req, res) => {
  const data = await setNetworkMode(req.body.mode);
  res.json({ ok: true, ...data, status: await connectivityStatus() });
});
