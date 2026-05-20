import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const PROGRESS_DIR = path.join(ROOT, 'data', 'brain', 'progress');
async function ensure() { await fs.mkdir(PROGRESS_DIR, { recursive: true }); }

export async function saveProgress(runId, payload) {
  await ensure();
  const progress = { runId, updatedAt: new Date().toISOString(), ...payload };
  await fs.writeFile(path.join(PROGRESS_DIR, `${runId}.json`), JSON.stringify(progress, null, 2));
  return progress;
}

export async function readProgress(runId) {
  const raw = await fs.readFile(path.join(PROGRESS_DIR, `${runId}.json`), 'utf8');
  return JSON.parse(raw);
}

export async function listProgress(limit = 20) {
  await ensure();
  const files = (await fs.readdir(PROGRESS_DIR)).filter(f => f.endsWith('.json'));
  const items = [];
  for (const file of files) {
    try { items.push(JSON.parse(await fs.readFile(path.join(PROGRESS_DIR, file), 'utf8'))); } catch {}
  }
  return items.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, limit);
}

export function progressFromSteps(steps = []) {
  if (!steps.length) return { percent: 0, current: 'Aguardando etapas' };
  const done = steps.filter(s => s.status === 'done').length;
  const current = steps.find(s => s.status !== 'done') || steps[steps.length - 1];
  return { percent: Math.round((done / steps.length) * 100), current: current.title || current.id };
}
