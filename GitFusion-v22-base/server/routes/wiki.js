import { Router } from 'express';
import { getWiki, updateWiki } from '../services/wiki.js';

export const wikiRouter = Router();

wikiRouter.get('/:projectId', async (req, res) => res.json({ wiki: await getWiki(req.params.projectId) }));
wikiRouter.put('/:projectId', async (req, res) => res.json({ wiki: await updateWiki(req.params.projectId, req.body) }));
