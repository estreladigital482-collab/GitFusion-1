import fs from 'fs-extra';
import path from 'path';
import { config } from '../config.js';

export async function ensureStorage() {
  await fs.ensureDir(config.workspaceDir);
  await fs.ensureDir(config.dataDir);
  await fs.ensureDir(path.join(config.dataDir, 'projects'));
  await fs.ensureDir(path.join(config.dataDir, 'memory'));
  await fs.ensureDir(path.join(config.dataDir, 'wiki'));
  await fs.ensureDir(path.join(config.dataDir, 'tasks'));
  await fs.ensureDir(path.join(config.dataDir, 'rag'));
  await fs.ensureDir(path.join(config.dataDir, 'learning'));
  await fs.ensureDir(path.join(config.dataDir, 'workspaces'));
}

export function jsonPath(collection, id = 'index') {
  return path.join(config.dataDir, collection, `${id}.json`);
}

export async function readJson(collection, id = 'index', fallback = {}) {
  try {
    return await fs.readJson(jsonPath(collection, id));
  } catch {
    return fallback;
  }
}

export async function writeJson(collection, id = 'index', data = {}) {
  const file = jsonPath(collection, id);
  await fs.ensureDir(path.dirname(file));
  await fs.writeJson(file, data, { spaces: 2 });
  return data;
}

export async function appendEvent(projectId, event) {
  const current = await readJson('projects', projectId, { events: [] });
  current.events = current.events || [];
  current.events.push({ ...event, at: new Date().toISOString() });
  await writeJson('projects', projectId, current);
  return current;
}
