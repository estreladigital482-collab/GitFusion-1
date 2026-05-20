import fs from 'fs-extra';
import path from 'path';
import { nanoid } from 'nanoid';
import { config } from '../config.js';

const INDEX = path.join(config.dataDir, 'workspaces', 'index.json');

function safeId(input='workspace') {
  return String(input).toLowerCase().replace(/[^a-z0-9_.-]/g, '-').replace(/^-+|-+$/g, '') || 'workspace';
}

async function dirSize(dir) {
  let total = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) total += await dirSize(full);
    else total += (await fs.stat(full).catch(() => ({ size: 0 }))).size || 0;
  }
  return total;
}

function human(bytes=0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes/1024/1024).toFixed(1)} MB`;
  return `${(bytes/1024/1024/1024).toFixed(1)} GB`;
}

async function ensureIndex() {
  await fs.ensureDir(path.dirname(INDEX));
  if (!(await fs.pathExists(INDEX))) {
    const id = 'pessoal';
    const now = new Date().toISOString();
    await fs.writeJson(INDEX, {
      activeId: id,
      workspaces: [{ id, name: 'Pessoal', createdAt: now, updatedAt: now }]
    }, { spaces: 2 });
    await fs.ensureDir(path.join(config.workspaceDir, id));
  }
}

export async function getWorkspaceState() {
  await ensureIndex();
  const index = await fs.readJson(INDEX);
  if (!index.workspaces?.length) {
    index.workspaces = [{ id: 'pessoal', name: 'Pessoal', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    index.activeId = 'pessoal';
  }
  if (!index.activeId || !index.workspaces.some(w => w.id === index.activeId)) index.activeId = index.workspaces[0].id;
  await fs.writeJson(INDEX, index, { spaces: 2 });
  await fs.ensureDir(path.join(config.workspaceDir, index.activeId));
  return index;
}

export async function createWorkspace(name='Novo espaço') {
  const index = await getWorkspaceState();
  const base = safeId(name);
  let id = base;
  while (index.workspaces.some(w => w.id === id)) id = `${base}-${nanoid(4)}`;
  const now = new Date().toISOString();
  const ws = { id, name: String(name || 'Novo espaço').trim() || 'Novo espaço', createdAt: now, updatedAt: now };
  index.workspaces.push(ws);
  index.activeId = id;
  await fs.writeJson(INDEX, index, { spaces: 2 });
  await fs.ensureDir(path.join(config.workspaceDir, id));
  return getWorkspaceState();
}

export async function setActiveWorkspace(id) {
  const index = await getWorkspaceState();
  const safe = safeId(id);
  if (!index.workspaces.some(w => w.id === safe)) throw new Error('Espaço de trabalho não encontrado.');
  index.activeId = safe;
  await fs.writeJson(INDEX, index, { spaces: 2 });
  await fs.ensureDir(path.join(config.workspaceDir, safe));
  return getWorkspaceState();
}

export async function updateActiveWorkspace(patch={}) {
  const index = await getWorkspaceState();
  const ws = index.workspaces.find(w => w.id === index.activeId);
  if (patch.name) ws.name = String(patch.name).trim() || ws.name;
  ws.updatedAt = new Date().toISOString();
  await fs.writeJson(INDEX, index, { spaces: 2 });
  return getWorkspaceState();
}

export async function removeWorkspace(id) {
  const index = await getWorkspaceState();
  const safe = safeId(id);
  if (safe === 'pessoal') throw new Error('O espaço Pessoal não pode ser removido.');
  index.workspaces = index.workspaces.filter(w => w.id !== safe);
  if (index.activeId === safe) index.activeId = index.workspaces[0]?.id || 'pessoal';
  await fs.writeJson(INDEX, index, { spaces: 2 });
  await fs.remove(path.join(config.workspaceDir, safe));
  return getWorkspaceState();
}

export async function workspaceStatus() {
  const index = await getWorkspaceState();
  const active = index.workspaces.find(w => w.id === index.activeId);
  const activeDir = path.join(config.workspaceDir, index.activeId);
  await fs.ensureDir(activeDir);
  const projectFiles = (await fs.readdir(path.join(config.dataDir, 'projects')).catch(() => [])).filter(f => f.endsWith('.json'));
  const jobDirs = (await fs.readdir(config.workspaceDir).catch(() => [])).length;
  const size = await dirSize(activeDir);
  return {
    active,
    workspaces: index.workspaces,
    projects: projectFiles.length,
    jobs: jobDirs,
    size,
    sizeLabel: human(size),
    relativeRoot: `workspaces/${index.activeId}/`,
  };
}

export async function cleanTmp() {
  const tmp = path.join(config.workspaceDir, '.tmp');
  let removed = 0;
  if (await fs.pathExists(tmp)) {
    const items = await fs.readdir(tmp).catch(() => []);
    removed = items.length;
    await fs.emptyDir(tmp);
  }
  return { removed };
}


// Session 15.9: visual workspace file system helpers.
const TEXT_EXTENSIONS = new Set(['.txt','.md','.json','.js','.mjs','.cjs','.css','.html','.xml','.svg','.yml','.yaml','.env','.gitignore','.dockerignore','.ts','.tsx','.jsx','.py','.sh','.java','.kt','.go','.rs','.php','.rb','.sql','.csv','.log']);
const MAX_FILE_BYTES = 768 * 1024;

function normalizeRelativePath(input='') {
  const rel = String(input || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const clean = path.posix.normalize(rel).replace(/^\.\/?/, '');
  if (!clean || clean === '.') return '';
  if (clean.startsWith('../') || clean === '..' || path.isAbsolute(clean)) throw new Error('Caminho fora do workspace bloqueado.');
  return clean;
}

async function activeWorkspaceRoot() {
  const state = await getWorkspaceState();
  const root = path.resolve(config.workspaceDir, state.activeId);
  await fs.ensureDir(root);
  return { root, state, active: state.workspaces.find(w => w.id === state.activeId) };
}

async function resolveWorkspacePath(rel='') {
  const clean = normalizeRelativePath(rel);
  const { root, active } = await activeWorkspaceRoot();
  const full = path.resolve(root, clean);
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error('Caminho fora do workspace bloqueado.');
  return { root, full, rel: clean, active };
}

function isTextFile(file) {
  const ext = path.extname(file).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || !ext;
}

async function workspaceTreeNode(full, root, depth=0, maxDepth=6) {
  const stat = await fs.stat(full);
  const rel = path.relative(root, full).replace(/\\/g, '/');
  const name = rel ? path.basename(full) : path.basename(root);
  if (!stat.isDirectory()) {
    return { name, path: rel, type: 'file', size: stat.size, updatedAt: stat.mtime.toISOString(), readable: isTextFile(full) && stat.size <= MAX_FILE_BYTES };
  }
  const children = [];
  if (depth < maxDepth) {
    const entries = await fs.readdir(full, { withFileTypes: true }).catch(() => []);
    entries.sort((a,b)=> Number(b.isDirectory())-Number(a.isDirectory()) || a.name.localeCompare(b.name));
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.cache') continue;
      children.push(await workspaceTreeNode(path.join(full, e.name), root, depth + 1, maxDepth));
    }
  }
  return { name, path: rel, type: 'dir', children, updatedAt: stat.mtime.toISOString() };
}

export async function listWorkspaceTree(options={}) {
  const { root, full, rel, active } = await resolveWorkspacePath(options.path || '');
  const exists = await fs.pathExists(full);
  if (!exists) await fs.ensureDir(full);
  const tree = await workspaceTreeNode(full, root, 0, Number(options.maxDepth || 6));
  const size = await dirSize(root);
  return { active, root: `workspaces/${active.id}`, path: rel, size, sizeLabel: human(size), tree };
}

export async function readWorkspaceFile(relPath='') {
  const { full, rel, active } = await resolveWorkspacePath(relPath);
  const stat = await fs.stat(full).catch(() => null);
  if (!stat || !stat.isFile()) throw new Error('Arquivo não encontrado.');
  if (stat.size > MAX_FILE_BYTES) throw new Error('Arquivo grande demais para abrir no editor mobile.');
  if (!isTextFile(full)) throw new Error('Tipo de arquivo não textual.');
  const content = await fs.readFile(full, 'utf8');
  return { active, path: rel, name: path.basename(full), size: stat.size, updatedAt: stat.mtime.toISOString(), content };
}

export async function writeWorkspaceFile(relPath='', content='') {
  const { full, rel, active } = await resolveWorkspacePath(relPath);
  await fs.ensureDir(path.dirname(full));
  const existed = await fs.pathExists(full);
  if (existed) {
    const backupDir = path.join(config.dataDir, 'workspace-backups', active.id, new Date().toISOString().replace(/[:.]/g, '-'));
    await fs.ensureDir(backupDir);
    await fs.copy(full, path.join(backupDir, rel.replace(/[\\/]/g, '__')));
  }
  await fs.writeFile(full, String(content ?? ''), 'utf8');
  return { ok: true, active, path: rel, bytes: Buffer.byteLength(String(content ?? ''), 'utf8'), backup: existed };
}

export async function createWorkspaceFolder(relPath='') {
  const { full, rel, active } = await resolveWorkspacePath(relPath);
  await fs.ensureDir(full);
  return { ok: true, active, path: rel };
}

export async function deleteWorkspacePath(relPath='') {
  const { full, rel, active, root } = await resolveWorkspacePath(relPath);
  if (!rel) throw new Error('Não é permitido apagar a raiz do workspace.');
  if (!(await fs.pathExists(full))) return { ok: true, active, path: rel, deleted: false };
  const backupDir = path.join(config.dataDir, 'workspace-trash', active.id, new Date().toISOString().replace(/[:.]/g, '-'));
  await fs.ensureDir(backupDir);
  await fs.move(full, path.join(backupDir, path.basename(full)), { overwrite: true });
  return { ok: true, active, path: rel, deleted: true, trash: path.relative(config.dataDir, backupDir).replace(/\\/g, '/') };
}
