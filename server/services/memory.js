import fs from 'fs-extra';
import path from 'path';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { readJson, writeJson } from './store.js';

function slugify(input = '') {
  return String(input || 'nota')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || `nota-${nanoid(6)}`;
}

function vaultDir(projectId = 'global') {
  return path.join(config.dataDir, 'memory', 'vaults', projectId);
}

function notePath(projectId, slug) {
  return path.join(vaultDir(projectId), `${slug}.md`);
}

function parseMeta(text = '') {
  const meta = {};
  let body = text;
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (match) {
    body = text.slice(match[0].length);
    for (const line of match[1].split('\n')) {
      const [key, ...rest] = line.split(':');
      if (!key) continue;
      const value = rest.join(':').trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        meta[key.trim()] = value.slice(1, -1).split(',').map(v => v.trim()).filter(Boolean);
      } else meta[key.trim()] = value;
    }
  }
  return { meta, body };
}

function stringifyMeta(meta = {}, body = '') {
  const lines = ['---'];
  for (const [key, value] of Object.entries(meta)) {
    if (Array.isArray(value)) lines.push(`${key}: [${value.join(', ')}]`);
    else lines.push(`${key}: ${String(value).replace(/\n/g, ' ')}`);
  }
  lines.push('---', body || '');
  return lines.join('\n');
}

function extractTags(text = '') {
  const tags = new Set();
  for (const match of text.matchAll(/(^|\s)#([\p{L}\p{N}_/-]+)/gu)) tags.add(match[2]);
  return [...tags];
}

function extractLinks(text = '') {
  const links = new Set();
  for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) links.add(match[1].trim());
  return [...links];
}

async function readMarkdownNote(projectId, file) {
  const full = path.join(vaultDir(projectId), file);
  const raw = await fs.readFile(full, 'utf8');
  const { meta, body } = parseMeta(raw);
  const slug = path.basename(file, '.md');
  return {
    id: meta.id || slug,
    projectId,
    slug,
    title: meta.title || slug,
    body,
    tags: [...new Set([...(Array.isArray(meta.tags) ? meta.tags : []), ...extractTags(body)])],
    links: extractLinks(body),
    source: meta.source || 'manual',
    createdAt: meta.createdAt || null,
    updatedAt: meta.updatedAt || null,
    path: path.relative(config.dataDir, full),
  };
}

export async function ensureVault(projectId = 'global') {
  await fs.ensureDir(vaultDir(projectId));
  const indexFile = notePath(projectId, 'index');
  if (!(await fs.pathExists(indexFile))) {
    await createNote(projectId, {
      title: 'Index',
      body: `# Index\n\nEste é o cofre local do projeto. Use links como [[Decisões]] e tags como #arquitetura.`,
      tags: ['index'],
      source: 'system',
      slug: 'index'
    });
  }
}

export async function listMemory(projectId = 'global') {
  await ensureVault(projectId);
  const files = (await fs.readdir(vaultDir(projectId))).filter(f => f.endsWith('.md'));
  const notes = [];
  for (const file of files) notes.push(await readMarkdownNote(projectId, file));
  return notes.sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
}

export async function getNote(projectId = 'global', slug = 'index') {
  await ensureVault(projectId);
  const file = notePath(projectId, slug);
  if (!(await fs.pathExists(file))) return null;
  return readMarkdownNote(projectId, `${slug}.md`);
}

export async function createNote(projectId = 'global', note = {}) {
  await fs.ensureDir(vaultDir(projectId));
  const title = note.title || 'Nova nota';
  const slug = note.slug ? slugify(note.slug) : slugify(title);
  const now = new Date().toISOString();
  const meta = {
    id: note.id || nanoid(10),
    title,
    tags: note.tags || extractTags(note.body || ''),
    source: note.source || 'manual',
    createdAt: now,
    updatedAt: now,
  };
  await fs.writeFile(notePath(projectId, slug), stringifyMeta(meta, note.body || ''), 'utf8');
  return getNote(projectId, slug);
}

export async function updateNote(projectId = 'global', slug = 'index', patch = {}) {
  const current = await getNote(projectId, slug);
  if (!current) return null;
  const title = patch.title ?? current.title;
  const body = patch.body ?? current.body;
  const tags = patch.tags ?? [...new Set([...(current.tags || []), ...extractTags(body)])];
  const meta = {
    id: current.id,
    title,
    tags,
    source: patch.source || current.source || 'manual',
    createdAt: current.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(notePath(projectId, slug), stringifyMeta(meta, body), 'utf8');
  return getNote(projectId, slug);
}

export async function deleteNote(projectId = 'global', slug = '') {
  if (!slug || slug === 'index') return { deleted: false, reason: 'A nota index não pode ser removida.' };
  await fs.remove(notePath(projectId, slug));
  return { deleted: true, slug };
}

export async function addMemory(projectId = 'global', note) {
  return createNote(projectId, note);
}

export async function searchMemory(projectId = 'global', query = '') {
  const q = String(query || '').toLowerCase();
  const notes = await listMemory(projectId);
  if (!q) return notes;
  return notes.filter(n => `${n.title} ${n.body} ${(n.tags || []).join(' ')} ${(n.links || []).join(' ')}`.toLowerCase().includes(q));
}

export async function backlinks(projectId = 'global', slugOrTitle = '') {
  const notes = await listMemory(projectId);
  const target = String(slugOrTitle || '').toLowerCase();
  return notes.filter(n => (n.links || []).some(l => slugify(l) === slugify(target) || l.toLowerCase() === target));
}

export async function memoryGraph(projectId = 'global') {
  const notes = await listMemory(projectId);
  const nodes = notes.map(n => ({ id: n.slug, title: n.title, tags: n.tags }));
  const edges = [];
  for (const note of notes) {
    for (const link of note.links || []) edges.push({ from: note.slug, to: slugify(link), label: link });
  }
  return { nodes, edges };
}

export async function exportVault(projectId = 'global') {
  await ensureVault(projectId);
  return { dir: vaultDir(projectId), notes: await listMemory(projectId) };
}
