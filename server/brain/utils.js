import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';

export const brainDir = path.join(config.dataDir, 'brain');
export const neuronsFile = path.join(brainDir, 'neurons.json');
export const synapsesFile = path.join(brainDir, 'synapses.json');
export const rewardsFile = path.join(brainDir, 'rewards.json');
export const thoughtsFile = path.join(brainDir, 'thoughts.json');
export const stateFile = path.join(brainDir, 'state.json');
export const datasetsDir = path.join(brainDir, 'datasets');

export async function ensureBrain() {
  await fs.ensureDir(brainDir);
  await fs.ensureDir(datasetsDir);
  for (const [file, fallback] of [
    [neuronsFile, []], [synapsesFile, []], [rewardsFile, []], [thoughtsFile, []],
    [stateFile, { createdAt: new Date().toISOString(), mode: 'local-first', activeSignals: [] }],
  ]) {
    if (!(await fs.pathExists(file))) await fs.writeJson(file, fallback, { spaces: 2 });
  }
}

export async function readBrainJson(file, fallback) {
  await ensureBrain();
  try { return await fs.readJson(file); } catch { return fallback; }
}

export async function writeBrainJson(file, value) {
  await ensureBrain();
  await fs.writeJson(file, value, { spaces: 2 });
  return value;
}

export function id(prefix='n') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export function now() { return new Date().toISOString(); }

export function tokens(text='') {
  return String(text).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9_./:-]+/).filter(Boolean).slice(0, 1000);
}

export function cosineLike(a=[], b=[]) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter=0; for (const x of A) if (B.has(x)) inter++;
  return inter / Math.sqrt(A.size * B.size);
}
