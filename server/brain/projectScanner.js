import fs from 'fs-extra';
import path from 'path';
import { config } from '../config.js';
import { getWorkspaceState } from '../services/workspace.js';

const IGNORE = new Set(['node_modules','.git','dist','build','.next','.cache','android','.gradle','coverage']);
const TEXT_EXT = new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.md','.css','.html','.txt','.env','.yml','.yaml']);
const MAX_FILES = 800;
const MAX_DEPTH = 7;

function safeSegment(input='') {
  return String(input).replace(/\\/g,'/').split('/').filter(Boolean).filter(p => p !== '.' && p !== '..').join('/');
}

export async function getActiveWorkspaceRoot(projectId = 'general') {
  await fs.ensureDir(config.workspaceDir);
  const state = await getWorkspaceState().catch(() => ({ activeId: 'pessoal' }));
  const id = safeSegment(projectId === 'general' ? (state.activeId || 'pessoal') : projectId) || 'pessoal';
  const root = path.join(config.workspaceDir, id);
  await fs.ensureDir(root);
  return root;
}

export async function scanWorkspace(projectId = 'general', options = {}) {
  const root = await getActiveWorkspaceRoot(projectId);
  const files = [];
  const directories = [];
  const packageFiles = [];
  async function walk(dir, depth = 0) {
    if (files.length >= (options.maxFiles || MAX_FILES) || depth > MAX_DEPTH) return;
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (IGNORE.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).replace(/\\/g,'/');
      if (entry.isDirectory()) { directories.push(rel); await walk(full, depth + 1); continue; }
      const stat = await fs.stat(full).catch(() => null);
      if (!stat) continue;
      const ext = path.extname(entry.name).toLowerCase();
      const item = { path: rel, name: entry.name, ext, size: stat.size, text: TEXT_EXT.has(ext) || entry.name === 'package.json' };
      files.push(item);
      if (entry.name === 'package.json') packageFiles.push(rel);
      if (files.length >= (options.maxFiles || MAX_FILES)) break;
    }
  }
  await walk(root);
  const stacks = detectStacks(files);
  return { root, files, directories, packageFiles, stacks, summary: summarizeScan({ files, directories, packageFiles, stacks }) };
}

function detectStacks(files) {
  const names = new Set(files.map(f => f.name));
  const paths = files.map(f => f.path.toLowerCase());
  const stacks = [];
  if (names.has('package.json')) stacks.push('node');
  if (paths.some(p => p.includes('react') || p.endsWith('.jsx') || p.endsWith('.tsx'))) stacks.push('react');
  if (names.has('vite.config.js') || names.has('vite.config.ts')) stacks.push('vite');
  if (names.has('capacitor.config.json') || names.has('capacitor.config.ts')) stacks.push('capacitor');
  if (names.has('server.js') || paths.some(p => p.startsWith('server/'))) stacks.push('express/server');
  if (names.has('requirements.txt') || paths.some(p => p.endsWith('.py'))) stacks.push('python');
  return [...new Set(stacks)];
}

function summarizeScan({ files, directories, packageFiles, stacks }) {
  const top = files.slice(0, 12).map(f => f.path).join(', ') || 'workspace vazio';
  return `${files.length} arquivo(s), ${directories.length} pasta(s). Stack: ${stacks.join(', ') || 'não detectada'}. package.json: ${packageFiles.length}. Principais: ${top}`;
}

export async function readSmallFile(projectId, relPath, limit = 12000) {
  const root = await getActiveWorkspaceRoot(projectId);
  const safe = safeSegment(relPath);
  const file = path.join(root, safe);
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Caminho fora do workspace.');
  const stat = await fs.stat(file);
  if (stat.size > limit) return { path: safe, skipped: true, reason: `Arquivo maior que ${limit} bytes.` };
  return { path: safe, content: await fs.readFile(file, 'utf8') };
}
