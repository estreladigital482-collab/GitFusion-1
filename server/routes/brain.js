import { Router } from 'express';
import {
  getBrainStatus,
  runBrain,
  readBrainRun,
  listBrainRuns,
  getMobileModelPlan,
  getBrainProgress,
  listBrainProgress
,
  executeBrainActions,
  runAutonomous,
  getLocalRuntime,
  getLocalModelChoice,
  runLocalModel,
  getLocalSetupPlan,
  getLocalCommandProbe,
  getBrainLearningSummary,
  getBrainLearningSuggestions,
  addBrainLearningEvent,
  listBrainLearningEvents
} from '../brain/brainCore.js';
import { startRealChat, getRealChatRun, getRealChatEngineStatus } from '../brain/realChatEngine.js';

export const brainRouter = Router();


brainRouter.get('/chat/status', async (_req, res) => {
  try { res.json(await getRealChatEngineStatus()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.post('/chat/start', async (req, res) => {
  try { res.json(await startRealChat(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.get('/chat/:id', async (req, res) => {
  try {
    const run = await getRealChatRun(req.params.id);
    if(!run) return res.status(404).json({ error: 'Execução não encontrada.' });
    res.json(run);
  } catch (error) { res.status(500).json({ error: error.message }); }
});



brainRouter.get('/learning/summary', async (req, res) => {
  try { res.json(await getBrainLearningSummary({ projectId: req.query.projectId, limit: req.query.limit })); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.get('/learning/events', async (req, res) => {
  try { res.json(await listBrainLearningEvents({ limit: req.query.limit })); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.post('/learning/suggest', async (req, res) => {
  try { res.json(await getBrainLearningSuggestions(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.post('/learning/event', async (req, res) => {
  try { res.json(await addBrainLearningEvent(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.get('/status', async (_req, res) => {
  try { res.json(await getBrainStatus()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});


brainRouter.get('/local/status', async (_req, res) => {
  try { res.json(await getLocalRuntime()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.get('/local/setup', async (_req, res) => {
  try { res.json(await getLocalSetupPlan()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.get('/local/probe', async (_req, res) => {
  try { res.json(await getLocalCommandProbe()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.post('/local/choose', async (req, res) => {
  try { res.json(await getLocalModelChoice(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.post('/local/generate', async (req, res) => {
  try { res.json(await runLocalModel(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.get('/mobile-models', async (_req, res) => {
  try { res.json(await getMobileModelPlan()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.get('/progress', async (req, res) => {
  try { res.json({ progress: await listBrainProgress(Number(req.query.limit || 20)) }); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.get('/progress/:id', async (req, res) => {
  try { res.json({ progress: await getBrainProgress(req.params.id) }); }
  catch (error) { res.status(404).json({ error: error.message }); }
});

brainRouter.get('/runs', async (req, res) => {
  try { res.json({ runs: await listBrainRuns(Number(req.query.limit || 30)) }); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.get('/runs/:id', async (req, res) => {
  try { res.json({ run: await readBrainRun(req.params.id) }); }
  catch (error) { res.status(404).json({ error: error.message }); }
});



brainRouter.post('/autonomous', async (req, res) => {
  try { res.json(await runAutonomous(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.post('/execute', async (req, res) => {
  try { res.json(await executeBrainActions(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.post('/run', async (req, res) => {
  try { res.json(await runBrain(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

brainRouter.post('/goal', async (req, res) => {
  try { res.json(await runBrain({ ...(req.body || {}), source: 'brain-goal' })); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
