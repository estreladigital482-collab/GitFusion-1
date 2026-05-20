import { Router } from 'express';
import { addMemory, listMemory, searchMemory, getNote, updateNote, deleteNote, backlinks, memoryGraph, exportVault } from '../services/memory.js';

export const memoryRouter = Router();

memoryRouter.get('/:projectId', async (req, res) => res.json({ notes: await listMemory(req.params.projectId) }));
memoryRouter.get('/:projectId/search', async (req, res) => res.json({ notes: await searchMemory(req.params.projectId, req.query.q || '') }));
memoryRouter.get('/:projectId/graph', async (req, res) => res.json({ graph: await memoryGraph(req.params.projectId) }));
memoryRouter.get('/:projectId/export', async (req, res) => res.json({ vault: await exportVault(req.params.projectId) }));
memoryRouter.get('/:projectId/:slug', async (req, res) => {
  const note = await getNote(req.params.projectId, req.params.slug);
  if (!note) return res.status(404).json({ error: 'Nota não encontrada.' });
  res.json({ note, backlinks: await backlinks(req.params.projectId, req.params.slug) });
});
memoryRouter.post('/:projectId', async (req, res) => res.json({ note: await addMemory(req.params.projectId, req.body) }));
memoryRouter.put('/:projectId/:slug', async (req, res) => res.json({ note: await updateNote(req.params.projectId, req.params.slug, req.body) }));
memoryRouter.delete('/:projectId/:slug', async (req, res) => res.json(await deleteNote(req.params.projectId, req.params.slug)));
