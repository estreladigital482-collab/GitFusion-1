import { readJson, writeJson } from './store.js';

export async function getWiki(projectId) {
  return readJson('wiki', projectId, {
    projectId,
    overview: '',
    architecture: '',
    decisions: [],
    generatedAt: null,
  });
}

export async function updateWiki(projectId, patch = {}) {
  const current = await getWiki(projectId);
  const next = { ...current, ...patch, projectId, updatedAt: new Date().toISOString() };
  await writeJson('wiki', projectId, next);
  return next;
}
