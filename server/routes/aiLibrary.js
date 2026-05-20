import express from 'express';
import { getAiLibraryStatus, thinkBeforeAct, searchPalace, appendTrainingExample } from '../brain/gitfusionAiLibrary.js';
import { createRoom, addMemoryObject, listRooms } from '../brain/memPalace.js';

const router = express.Router();

router.get('/status', async (_req, res) => {
  try { res.json(await getAiLibraryStatus()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/think', async (req, res) => {
  try { res.json(await thinkBeforeAct(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/palace/rooms', async (_req, res) => {
  try { res.json(await listRooms()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/palace/rooms', async (req, res) => {
  try { res.json(await createRoom(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/palace/object', async (req, res) => {
  try { res.json(await addMemoryObject(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/palace/search', async (req, res) => {
  try { res.json(await searchPalace(req.query.q || '')); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/dataset/example', async (req, res) => {
  try { res.json(await appendTrainingExample(req.body || {})); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
