import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const LIBRARY_PATH = path.join(ROOT, 'config', 'model-library.json');

export async function readModelLibrary() {
  const raw = await fs.readFile(LIBRARY_PATH, 'utf8');
  return JSON.parse(raw);
}

export async function listLocalModelProfiles() {
  const library = await readModelLibrary();
  return library.models.map(model => ({
    id: model.id,
    name: model.name,
    roles: model.roles,
    provider: model.provider,
    deviceTier: model.deviceTier,
    candidates: model.ollamaNames || [],
    notes: model.notes
  }));
}

export async function getRuntimeConfig(runtimeName = 'ollama') {
  const library = await readModelLibrary();
  return library.runtimes[runtimeName] || null;
}

export async function pickModelForTask(taskText = '', installedModels = []) {
  const library = await readModelLibrary();
  const text = String(taskText).toLowerCase();
  let role = 'planner';

  if (/c[oó]digo|code|repo|merge|mescl|arquivo|fix|bug|build/.test(text)) role = 'code';
  if (/explica|ensina|aprend|wiki|document/.test(text)) role = 'explain';
  if (/revis|review|corrig|erro/.test(text)) role = 'reviewer';

  const installed = new Set(installedModels.map(x => typeof x === 'string' ? x : x.name));
  const candidates = library.models.filter(model => model.roles.includes(role));

  for (const model of candidates) {
    for (const name of model.ollamaNames || []) {
      if (installed.has(name)) return { ...model, selectedName: name, role };
    }
  }

  return {
    id: 'offline-symbolic',
    name: 'GitFusion Offline Symbolic Brain',
    provider: 'internal',
    selectedName: 'offline-symbolic',
    role,
    notes: 'Nenhum modelo local encontrado. Usa RAG, memória, regras e planejamento simbólico.'
  };
}
