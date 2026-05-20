import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import { config } from './config.js';
import { ensureStorage } from './services/store.js';
import { systemRouter } from './routes/system.js';
import { memoryRouter } from './routes/memory.js';
import { wikiRouter } from './routes/wiki.js';
import { tasksRouter } from './routes/tasks.js';
import { aiRouter } from './routes/ai.js';
import { projectsRouter } from './routes/projects.js';
import { connectivityRouter } from './routes/connectivity.js';
import { ragRouter } from './routes/rag.js';
import { modelRouter } from './routes/model.js';
import { executorRouter } from './routes/executor.js';
import { workspaceRouter } from './routes/workspace.js';
import { learningRouter } from './routes/learning.js';
import { terminalRouter } from './routes/terminal.js';
import { githubRouter } from './routes/github.js';
import { brainRouter } from './routes/brain.js';
import aiLibraryRouter from './routes/aiLibrary.js';

await ensureStorage();
await fs.ensureDir(config.publicDir);

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use(express.static(config.publicDir));

app.use('/api', systemRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/wiki', wikiRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/ai', aiRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/connectivity', connectivityRouter);
app.use('/api/rag', ragRouter);
app.use('/api/model', modelRouter);
app.use('/api/executor', executorRouter);
app.use('/api/workspace', workspaceRouter);
app.use('/api/learning', learningRouter);
app.use('/api/terminal', terminalRouter);
app.use('/api/github', githubRouter);
app.use('/api/brain', brainRouter);
app.use('/api/ai-library', aiLibraryRouter);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Erro interno do GitFusion.' });
});

app.get('*', async (req, res) => {
  const index = path.join(config.publicDir, 'index.html');
  if (await fs.pathExists(index)) return res.sendFile(index);
  res.json({ ok: true, name: 'GitFusion API', version: '0.1.22' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`GitFusion running on http://0.0.0.0:${config.port}`);
  console.log(`Storage: ${config.dataDir}`);
  console.log(`Workspace: ${config.workspaceDir}`);
});
