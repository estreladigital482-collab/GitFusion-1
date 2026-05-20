import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const DATASET_DIR = path.join(ROOT, 'training', 'datasets');

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

export async function appendTrainingExample({ workspaceId = 'default', projectId = 'general', instruction, input = '', output = '', metadata = {} }) {
  await ensureDir(DATASET_DIR);
  const date = new Date().toISOString().slice(0, 10);
  const filePath = path.join(DATASET_DIR, `gitfusion-${date}.jsonl`);
  const record = {
    instruction,
    input,
    output,
    workspaceId,
    projectId,
    metadata,
    createdAt: new Date().toISOString()
  };
  await fs.appendFile(filePath, JSON.stringify(record) + '\n');
  return { filePath, record };
}

export async function exportProjectDataset({ workspaceId = 'default', projectId = 'general', events = [] }) {
  await ensureDir(DATASET_DIR);
  const filePath = path.join(DATASET_DIR, `${workspaceId}-${projectId}-dataset.jsonl`.replace(/[^a-zA-Z0-9._-]/g, '-'));
  const lines = events.map(event => JSON.stringify({
    instruction: event.instruction || event.prompt || 'Continue o trabalho do GitFusion.',
    input: event.input || event.context || '',
    output: event.output || event.result || '',
    workspaceId,
    projectId,
    metadata: event.metadata || {},
    createdAt: event.createdAt || new Date().toISOString()
  }));
  await fs.writeFile(filePath, lines.join('\n') + (lines.length ? '\n' : ''));
  return { filePath, count: lines.length };
}
