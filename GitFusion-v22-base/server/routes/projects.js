import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { config } from '../config.js';
import { importRepos, tree } from '../services/repositories.js';
import { writeJson, readJson } from '../services/store.js';
import { createTask } from '../services/tasks.js';
import { updateWiki } from '../services/wiki.js';
import { addMemory } from '../services/memory.js';

export const projectsRouter = Router();

projectsRouter.get('/', async (req, res) => {
  const dir = path.join(config.dataDir, 'projects');
  await fs.ensureDir(dir);
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json'));
  const projects = [];
  for (const file of files) projects.push(await fs.readJson(path.join(dir, file)));
  res.json({ projects });
});

projectsRouter.post('/start', async (req, res) => {
  const urls = Array.isArray(req.body.repos) ? req.body.repos : [];
  const name = req.body.name || 'Projeto GitFusion';
  if (urls.length < 2) return res.status(400).json({ error: 'Informe pelo menos 2 repositórios.' });
  const imported = await importRepos(urls);
  const project = {
    id: imported.projectId,
    name,
    status: 'planning',
    progress: 10,
    repos: imported.repos.map(r => ({ owner: r.owner, repo: r.repo, url: r.url, branch: r.branch, safe: r.safe })),
    logs: imported.logs,
    createdAt: new Date().toISOString(),
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
  const projectDir = path.join(config.workspaceDir, req.params.projectId);
  res.json({ tree: await tree(projectDir) });
});
