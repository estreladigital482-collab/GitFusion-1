import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ROOT = process.cwd();
const BRAIN_DIR = path.join(ROOT, 'data', 'brain');
const RUNS_DIR = path.join(BRAIN_DIR, 'runs');

async function ensure() { await fs.mkdir(RUNS_DIR, { recursive: true }); }
export function makeRunId() { return `brain_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`; }

export async function saveBrainRun(run) {
  await ensure();
  const full = { ...run, updatedAt: new Date().toISOString() };
  await fs.writeFile(path.join(RUNS_DIR, `${full.id}.json`), JSON.stringify(full, null, 2));
  return full;
}

export async function readBrainRun(id) {
  await ensure();
  const raw = await fs.readFile(path.join(RUNS_DIR, `${id}.json`), 'utf8');
  return JSON.parse(raw);
}

export async function listBrainRuns(limit = 30) {
  await ensure();
  const files = (await fs.readdir(RUNS_DIR)).filter(f => f.endsWith('.json'));
  const runs = [];
  for (const file of files) {
    try { runs.push(JSON.parse(await fs.readFile(path.join(RUNS_DIR, file), 'utf8'))); } catch {}
  }
  return runs.sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt))).slice(0, limit);
}
