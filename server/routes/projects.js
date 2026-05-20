import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { config } from '../config.js';
import { importRepos, tree } from '../services/repositories.js';
import { writeJson, readJson } from '../services/store.js';
import { createTask } from '../services/tasks.js';
import { updateWiki } from '../services/wiki.js';
import { addMemory } from '../services/memory.js';
import { ensureProjectSystem, createProjectChat, listProjectChats, addProjectChatMessage, getProjectDashboard, bootstrapProjectFromPrompt, refreshProjectStats } from '../services/projectHub.js';

export const projectsRouter = Router();

const metaPath = (id) => path.join(config.dataDir, 'projects', `${id}.json`);
const safeJoin = (base, target = '') => {
  const full = path.resolve(base, target);
  if (!full.startsWith(path.resolve(base))) throw new Error('Caminho inválido.');
  return full;
};
async function loadProject(id) {
  const file = metaPath(id);
  if (!(await fs.pathExists(file))) return null;
  return fs.readJson(file);
}
async function countTree(nodes = []) {
  let n = 0;
  for (const item of nodes) { n += 1; if (item.children) n += await countTree(item.children); }
  return n;
}



projectsRouter.post('/smart', async (req, res) => {
  const dashboard = await bootstrapProjectFromPrompt({
    name: req.body.name || 'Novo projeto GitFusion',
    goal: req.body.goal || req.body.prompt || '',
    repos: Array.isArray(req.body.repos) ? req.body.repos : []
  });
  res.json(dashboard);
});

projectsRouter.get('/:projectId/dashboard', async (req, res) => {
  const dashboard = await getProjectDashboard(req.params.projectId);
  if (!dashboard) return res.status(404).json({ error: 'Projeto não encontrado.' });
  res.json(dashboard);
});

projectsRouter.post('/:projectId/ensure', async (req, res) => {
  const project = await ensureProjectSystem(req.params.projectId, { name: req.body.name });
  res.json({ project });
});

projectsRouter.get('/:projectId/chats', async (req, res) => {
  await ensureProjectSystem(req.params.projectId, {});
  const chats = await listProjectChats(req.params.projectId);
  res.json({ projectId: req.params.projectId, chats });
});

projectsRouter.post('/:projectId/chats', async (req, res) => {
  const result = await createProjectChat(req.params.projectId, {
    title: req.body.title || 'Novo chat do projeto',
    messages: req.body.messages
  });
  res.json(result);
});

projectsRouter.post('/:projectId/chats/:chatId/messages', async (req, res) => {
  const message = await addProjectChatMessage(req.params.projectId, req.params.chatId, {
    role: req.body.role || 'user',
    text: req.body.text || '',
    remember: req.body.remember
  });
  res.json({ message });
});

projectsRouter.post('/:projectId/tasks/bootstrap', async (req, res) => {
  const project = await ensureProjectSystem(req.params.projectId, { name: req.body.name });
  const tasks = [];
  for (const item of Array.isArray(req.body.tasks) ? req.body.tasks : []) {
    tasks.push(await createTask(project.id, item));
  }
  res.json({ project: await refreshProjectStats(project.id), tasks });
});

projectsRouter.get('/', async (req, res) => {
  const dir = path.join(config.dataDir, 'projects');
  await fs.ensureDir(dir);
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json'));
  const projects = [];
  for (const file of files) {
    const p = await fs.readJson(path.join(dir, file));
    const nodes = await tree(path.join(config.workspaceDir, p.id || p.jobId)).catch(() => []);
    projects.push({ ...p, fileCount: await countTree(nodes), files: await countTree(nodes) });
  }
  projects.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  res.json({ projects });
});

projectsRouter.post('/start', async (req, res) => {
  const urls = Array.isArray(req.body.repos) ? req.body.repos : [];
  const name = req.body.name || 'Projeto GitFusion';
  if (urls.length < 2) return res.status(400).json({ error: 'Informe pelo menos 2 repositórios.' });
  const imported = await importRepos(urls);
  const project = {
    id: imported.projectId,
    jobId: imported.projectId,
    name,
    status: 'planning',
    progress: 10,
    repos: imported.repos.map(r => ({ owner: r.owner, repo: r.repo, url: r.url, branch: r.branch, safe: r.safe })),
    logs: imported.logs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await writeJson('projects', imported.projectId, project);
  await updateWiki(imported.projectId, {
    overview: `Projeto criado a partir de ${urls.length} repositórios.`,
    architecture: 'Arquitetura será mapeada na próxima sessão.',
    generatedAt: new Date().toISOString(),
  });
  await addMemory(imported.projectId, { title: 'Criação do projeto', body: `Repositórios importados: ${urls.join(', ')}`, source: 'system' });
  await createTask(imported.projectId, { title: 'Analisar arquitetura dos repositórios', description: 'Mapear stacks, pastas principais e pontos de conflito.', estimateMinutes: 5 });
  await createTask(imported.projectId, { title: 'Planejar fusão segura', description: 'Definir base, imports e estratégia de união.', estimateMinutes: 8 });
  res.json({ project });
});

projectsRouter.get('/:projectId/tree', async (req, res) => {
  const project = await loadProject(req.params.projectId);
  const projectDir = path.join(config.workspaceDir, req.params.projectId);
  const nodes = await tree(projectDir);
  res.json({ project, tree: nodes, files: nodes, name: project?.name || req.params.projectId });
});

projectsRouter.get('/:projectId/file', async (req, res) => {
  const projectDir = path.join(config.workspaceDir, req.params.projectId);
  const filePath = String(req.query.path || '');
  const full = safeJoin(projectDir, filePath);
  const stat = await fs.stat(full).catch(() => null);
  if (!stat || !stat.isFile()) return res.status(404).json({ error: 'Arquivo não encontrado.' });
  if (stat.size > 300_000) return res.status(413).json({ error: 'Arquivo grande demais para preview.' });
  const content = await fs.readFile(full, 'utf8').catch(() => '[Arquivo binário ou não legível]');
  res.json({ path: filePath, content });
});

projectsRouter.patch('/:projectId', async (req, res) => {
  const project = await loadProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  if (req.body.name) project.name = String(req.body.name).slice(0, 120);
  project.updatedAt = new Date().toISOString();
  await fs.writeJson(metaPath(req.params.projectId), project, { spaces: 2 });
  res.json({ project });
});

projectsRouter.delete('/:projectId', async (req, res) => {
  await fs.remove(metaPath(req.params.projectId));
  await fs.remove(path.join(config.workspaceDir, req.params.projectId));
  res.json({ ok: true });
});

projectsRouter.get('/:projectId/export', async (req, res) => {
  const projectDir = path.join(config.workspaceDir, req.params.projectId);
  if (!(await fs.pathExists(projectDir))) return res.status(404).json({ error: 'Projeto não encontrado.' });
  const zip = new AdmZip();
  zip.addLocalFolder(projectDir);
  const out = path.join(config.dataDir, 'exports', `${req.params.projectId}.zip`);
  await fs.ensureDir(path.dirname(out));
  zip.writeZip(out);
  res.download(out, `${req.params.projectId}.zip`);
});
