import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { config } from '../config.js';
import { githubMe, publishProject, pullProject, listBranches, createBranch } from '../services/github.js';

export const githubRouter = Router();
const metaPath = (id) => path.join(config.dataDir, 'projects', `${id}.json`);
async function loadProject(id){ return fs.pathExists(metaPath(id)).then(ok=>ok?fs.readJson(metaPath(id)):null); }
function tokenFrom(req){ return req.body?.token || req.headers['x-github-token'] || config.githubToken || ''; }

githubRouter.get('/me', async (req,res)=>{ const token=req.headers['x-github-token'] || config.githubToken || ''; res.json(await githubMe(token)); });

githubRouter.post('/publish', async (req,res)=>{
  const token = tokenFrom(req);
  const projectId = req.body.projectId;
  const project = await loadProject(projectId);
  if(!project) return res.status(404).json({ error:'Projeto não encontrado.' });
  const result = await publishProject({
    token, project, projectId,
    repoName:req.body.repoName,
    description:req.body.description,
    privateRepo:req.body.private !== false,
    branch:req.body.branch || 'main',
    includeReadme:req.body.includeReadme !== false,
    includeTasks:req.body.includeTasks !== false
  });
  project.github = { ...result.repo, branch:result.branch, publishedAt:new Date().toISOString() };
  project.updatedAt = new Date().toISOString();
  await fs.writeJson(metaPath(projectId), project, { spaces:2 });
  res.json(result);
});

githubRouter.post('/:projectId/pull', async (req,res)=>{ res.json(await pullProject({ projectId:req.params.projectId, branch:req.body.branch || 'main' })); });
githubRouter.get('/:projectId/branches', async (req,res)=>{ res.json(await listBranches(req.params.projectId)); });
githubRouter.post('/:projectId/branches', async (req,res)=>{ res.json(await createBranch(req.params.projectId, req.body.name)); });
