import path from 'path';
import fs from 'fs-extra';
import { datasetsDir, now } from './utils.js';

export async function appendDatasetExample({ instruction='', input='', output='', metadata={} } = {}) {
  await fs.ensureDir(datasetsDir);
  const date = new Date().toISOString().slice(0,10);
  const file = path.join(datasetsDir, `${date}.jsonl`);
  const row = { instruction, input, output, metadata, createdAt: now() };
  await fs.appendFile(file, JSON.stringify(row) + '\n');
  return { file, row };
}

export async function listDatasets() {
  await fs.ensureDir(datasetsDir);
  return (await fs.readdir(datasetsDir)).filter(f => f.endsWith('.jsonl'));
}
