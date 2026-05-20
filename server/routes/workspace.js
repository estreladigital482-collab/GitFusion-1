import { Router } from 'express';
import { cleanTmp, createWorkspace, getWorkspaceState, removeWorkspace, setActiveWorkspace, updateActiveWorkspace, workspaceStatus, listWorkspaceTree, readWorkspaceFile, writeWorkspaceFile, createWorkspaceFolder, deleteWorkspacePath } from '../services/workspace.js';

export const workspaceRouter = Router();

workspaceRouter.get('/status', async (req, res) => res.json(await workspaceStatus()));
workspaceRouter.get('/settings', async (req, res) => {
  const s = await getWorkspaceState();
  const active = s.workspaces.find(w => w.id === s.activeId);
  res.json({ ...active, activeId: s.activeId, workspaces: s.workspaces });
});
workspaceRouter.post('/settings', async (req, res) => res.json(await updateActiveWorkspace(req.body || {})));
workspaceRouter.post('/create', async (req, res) => res.json(await createWorkspace(req.body?.name || 'Novo espaço')));
workspaceRouter.post('/active', async (req, res) => res.json(await setActiveWorkspace(req.body?.id)));

workspaceRouter.get('/tree', async (req, res) => res.json(await listWorkspaceTree({ path: req.query.path || '', maxDepth: req.query.maxDepth || 6 })));
workspaceRouter.get('/file', async (req, res) => res.json(await readWorkspaceFile(req.query.path || '')));
workspaceRouter.post('/file', async (req, res) => res.json(await writeWorkspaceFile(req.body?.path || '', req.body?.content || '')));
workspaceRouter.post('/folder', async (req, res) => res.json(await createWorkspaceFolder(req.body?.path || '')));
workspaceRouter.delete('/path', async (req, res) => res.json(await deleteWorkspacePath(req.query.path || req.body?.path || '')));
workspaceRouter.delete('/:id', async (req, res) => res.json(await removeWorkspace(req.params.id)));
workspaceRouter.delete('/tmp/clean', async (req, res) => res.json(await cleanTmp()));
workspaceRouter.delete('/tmp', async (req, res) => res.json(await cleanTmp()));
