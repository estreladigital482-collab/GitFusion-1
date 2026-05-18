import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const WORKSPACE_DIR = path.resolve(process.env.WORKSPACE_DIR || path.join(ROOT, 'workspaces'));
const PORT = Number(process.env.PORT || 3737);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(PUBLIC_DIR));

await fs.ensureDir(WORKSPACE_DIR);

const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.nuxt', 'coverage', '.cache', 'vendor']);
const ignoredFiles = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);
const textExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.css', '.html', '.yml', '.yaml', '.env', '.txt']);

function parseGitHubRepo(input) {
  const raw = String(input || '').trim().replace(/\.git$/, '');
  const match = raw.match(/github\.com[:/](?<owner>[^/\s]+)\/(?<repo>[^/#?\s]+)/i);
  if (!match?.groups) throw new Error(`URL inválida: ${input}`);
  const owner = match.groups.owner;
  const repo = match.groups.repo;
  const safe = `${owner}-${repo}`.replace(/[^a-z0-9_.-]/gi, '-').toLowerCase();
  return { owner, repo, safe, url: `https://github.com/${owner}/${repo}` };
}

async function fetchRepoZip(meta, branch) {
  const url = `https://codeload.github.com/${meta.owner}/${meta.repo}/zip/refs/heads/${branch}`;
  const headers = { 'User-Agent': 'GitFusion/0.1' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Falha ao baixar ${meta.owner}/${meta.repo}@${branch}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 500) throw new Error(`Arquivo ZIP de ${meta.owner}/${meta.repo} parece inválido.`);
  return buffer;
}

async function downloadRepo(meta, jobDir, logs) {
  const repoDir = path.join(jobDir, 'repos', meta.safe);
  await fs.remove(repoDir);
  await fs.ensureDir(repoDir);
  logs.push(`download: tentando ${meta.owner}/${meta.repo}@main`);
  let zipBuffer;
  let branch = 'main';
  try {
    zipBuffer = await fetchRepoZip(meta, 'main');
  } catch (error) {
    logs.push(`download: main falhou, tentando master`);
    branch = 'master';
    zipBuffer = await fetchRepoZip(meta, 'master');
  }

  const zipPath = path.join(jobDir, `${meta.safe}.zip`);
  await fs.writeFile(zipPath, zipBuffer);
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(repoDir, true);
  const children = await fs.readdir(repoDir);
  const extractedRoot = children.length === 1 ? path.join(repoDir, children[0]) : repoDir;
  const finalDir = path.join(jobDir, 'repos-final', meta.safe);
  await fs.remove(finalDir);
  await fs.ensureDir(path.dirname(finalDir));
  await fs.move(extractedRoot, finalDir, { overwrite: true });
  logs.push(`download: ${meta.owner}/${meta.repo} pronto (${branch})`);
  return { ...meta, branch, dir: finalDir };
}

async function walkTree(dir, base = dir, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const result = [];
  for (const entry of entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    if (ignoredFiles.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    const item = { name: entry.name, path: rel, type: entry.isDirectory() ? 'dir' : 'file' };
    if (entry.isDirectory()) item.children = await walkTree(full, base, depth + 1, maxDepth);
    result.push(item);
  }
  return result;
}

async function readJsonSafe(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; }
}

async function analyzeRepo(repo) {
  const pkg = await readJsonSafe(path.join(repo.dir, 'package.json'));
  const tree = await walkTree(repo.dir);
  const files = [];
  async function scan(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await scan(full);
      else files.push(path.relative(repo.dir, full));
    }
  }
  await scan(repo.dir);
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const stack = [];
  if (deps.react) stack.push('React');
  if (deps.vite) stack.push('Vite');
  if (deps.next) stack.push('Next.js');
  if (deps.express) stack.push('Express');
  if (deps.tailwindcss) stack.push('Tailwind');
  if (deps['@capacitor/core']) stack.push('Capacitor');
  return { ...repo, packageName: pkg?.name || repo.repo, scripts: pkg?.scripts || {}, deps, stack, fileCount: files.length, tree };
}

function mergeDependencies(repos) {
  const merged = {};
  const conflicts = [];
  for (const repo of repos) {
    for (const [name, version] of Object.entries(repo.deps || {})) {
      if (merged[name] && merged[name] !== version) conflicts.push({ package: name, versions: [...new Set([merged[name], version])] });
      merged[name] = merged[name] || version;
    }
  }
  return { merged, conflicts };
}

async function copyRepoPreserving(target, repo, subdir) {
  const destination = path.join(target, subdir);
  await fs.ensureDir(path.dirname(destination));
  await fs.copy(repo.dir, destination, {
    filter: (src) => {
      const name = path.basename(src);
      return !ignoredDirs.has(name);
    }
  });
}

async function createFusion(jobDir, analyzedRepos, baseIndex, projectName, logs) {
  const safeProject = (projectName || 'gitfusion-output').replace(/[^a-z0-9_.-]/gi, '-').toLowerCase();
  const outputDir = path.join(jobDir, 'output', safeProject);
  await fs.remove(outputDir);
  await fs.ensureDir(outputDir);

  const base = analyzedRepos[baseIndex] || analyzedRepos[0];
  logs.push(`fusion: copiando base ${base.owner}/${base.repo}`);
  await fs.copy(base.dir, outputDir, {
    filter: (src) => !ignoredDirs.has(path.basename(src))
  });

  const importedDir = path.join(outputDir, 'gitfusion-imports');
  await fs.ensureDir(importedDir);
  for (const repo of analyzedRepos) {
    if (repo.safe === base.safe) continue;
    logs.push(`fusion: incorporando ${repo.owner}/${repo.repo} em gitfusion-imports/`);
    await copyRepoPreserving(importedDir, repo, repo.safe);
  }

  const { merged, conflicts } = mergeDependencies(analyzedRepos);
  const report = `# GitFusion Report\n\nProjeto gerado: ${projectName}\n\nBase: ${base.url}\n\n## Repositórios analisados\n${analyzedRepos.map(r => `- ${r.url} (${r.stack.join(', ') || 'stack não detectada'})`).join('\n')}\n\n## Estratégia de fusão\n\n- O repositório base foi mantido na raiz.\n- Os demais repositórios foram importados em \`gitfusion-imports/\`.\n- Dependências foram analisadas e registradas em \`gitfusion.dependencies.json\`.\n- Conflitos de versão foram registrados para revisão humana.\n\n## Conflitos detectados\n${conflicts.length ? conflicts.map(c => `- ${c.package}: ${c.versions.join(' vs ')}`).join('\n') : '- Nenhum conflito de versão detectado.'}\n\n## Próximos passos recomendados\n\n1. Revisar componentes importados.\n2. Escolher telas que serão migradas para a base.\n3. Unificar design system.\n4. Rodar instalação de dependências.\n5. Testar build web e Android.\n`;
  await fs.writeFile(path.join(outputDir, 'GITFUSION_REPORT.md'), report);
  await fs.writeJson(path.join(outputDir, 'gitfusion.dependencies.json'), { merged, conflicts }, { spaces: 2 });
  await fs.writeJson(path.join(outputDir, 'gitfusion.manifest.json'), {
    projectName, createdAt: new Date().toISOString(), base: base.url, repos: analyzedRepos.map(r => r.url)
  }, { spaces: 2 });
  logs.push(`fusion: saída criada em ${path.relative(jobDir, outputDir)}`);
  return outputDir;
}

function zipDirectory(sourceDir, zipPath) {
  const zip = new AdmZip();
  zip.addLocalFolder(sourceDir);
  zip.writeZip(zipPath);
}

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'GitFusion', time: new Date().toISOString() }));

app.post('/api/analyze', async (req, res) => {
  const logs = [];
  try {
    const reposInput = Array.isArray(req.body.repos) ? req.body.repos : [];
    if (reposInput.length < 2) return res.status(400).json({ error: 'Informe pelo menos 2 repositórios.' });
    const metas = reposInput.map(parseGitHubRepo);
    const jobId = nanoid(10);
    const jobDir = path.join(WORKSPACE_DIR, jobId);
    await fs.ensureDir(jobDir);
    logs.push(`job: ${jobId}`);
    const downloaded = [];
    for (const meta of metas) downloaded.push(await downloadRepo(meta, jobDir, logs));
    const analyzed = [];
    for (const repo of downloaded) {
      logs.push(`analysis: lendo ${repo.owner}/${repo.repo}`);
      analyzed.push(await analyzeRepo(repo));
    }
    await fs.writeJson(path.join(jobDir, 'analysis.json'), { jobId, analyzed, logs }, { spaces: 2 });
    res.json({ jobId, repos: analyzed.map(r => ({
      owner: r.owner, repo: r.repo, url: r.url, branch: r.branch, safe: r.safe, stack: r.stack, scripts: r.scripts, fileCount: r.fileCount, tree: r.tree
    })), logs });
  } catch (error) {
    logs.push(`error: ${error.message}`);
    res.status(500).json({ error: error.message, logs });
  }
});

app.post('/api/fuse', async (req, res) => {
  const logs = [];
  try {
    const { jobId, baseIndex = 0, projectName = 'gitfusion-output' } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId é obrigatório.' });
    const jobDir = path.join(WORKSPACE_DIR, String(jobId));
    const analysis = await fs.readJson(path.join(jobDir, 'analysis.json'));
    const analyzed = analysis.analyzed;
    logs.push(...(analysis.logs || []));
    const outputDir = await createFusion(jobDir, analyzed, Number(baseIndex), projectName, logs);
    const zipPath = path.join(jobDir, `${path.basename(outputDir)}.zip`);
    zipDirectory(outputDir, zipPath);
    logs.push(`export: ZIP pronto`);
    await fs.writeJson(path.join(jobDir, 'fusion.json'), { outputDir, zipPath, logs }, { spaces: 2 });
    res.json({ jobId, downloadUrl: `/api/download/${jobId}`, logs });
  } catch (error) {
    logs.push(`error: ${error.message}`);
    res.status(500).json({ error: error.message, logs });
  }
});

app.get('/api/download/:jobId', async (req, res) => {
  try {
    const jobDir = path.join(WORKSPACE_DIR, req.params.jobId);
    const fusion = await fs.readJson(path.join(jobDir, 'fusion.json'));
    res.download(fusion.zipPath);
  } catch (error) {
    res.status(404).json({ error: 'ZIP não encontrado. Rode a fusão primeiro.' });
  }
});

app.post('/api/clean', async (req, res) => {
  await fs.emptyDir(WORKSPACE_DIR);
  await fs.ensureDir(path.join(WORKSPACE_DIR, '.keep'));
  res.json({ ok: true });
});

app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GitFusion running on http://0.0.0.0:${PORT}`);
});
