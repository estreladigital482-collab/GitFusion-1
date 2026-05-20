import { nanoid } from 'nanoid';
import { readJson, writeJson } from './store.js';

export async function listMemory(projectId = 'global') {
  const db = await readJson('memory', projectId, { notes: [] });
  return db.notes || [];
}

export async function addMemory(projectId = 'global', note) {
  const db = await readJson('memory', projectId, { notes: [] });
  const item = {
    id: nanoid(10),
    projectId,
    title: note.title || 'Nota',
    body: note.body || '',
    tags: note.tags || [],
    source: note.source || 'manual',
    createdAt: new Date().toISOString(),
  };
  db.notes.push(item);
  await writeJson('memory', projectId, db);
  return item;
}

export async function searchMemory(projectId = 'global', query = '') {
  const q = query.toLowerCase();
  const notes = await listMemory(projectId);
  if (!q) return notes;
  return notes.filter(n => `${n.title} ${n.body} ${(n.tags || []).join(' ')}`.toLowerCase().includes(q));
}
