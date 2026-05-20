import { Router } from 'express';
import { addMemory, listMemory, searchMemory } from '../services/memory.js';

export const memoryRouter = Router();

memoryRouter.get('/:projectId', async (req, res) => res.json({ notes: await listMemory(req.params.projectId) }));
memoryRouter.get('/:projectId/search', async (req, res) => res.json({ notes: await searchMemory(req.params.projectId, req.query.q || '') }));
memoryRouter.post('/:projectId', async (req, res) => res.json({ note: await addMemory(req.params.projectId, req.body) }));
