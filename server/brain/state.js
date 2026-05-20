import { stateFile, readBrainJson, writeBrainJson, now } from './utils.js';

export async function getBrainState() {
  return readBrainJson(stateFile, { createdAt: now(), activeSignals: [] });
}

export async function updateBrainState(patch={}) {
  const current = await getBrainState();
  return writeBrainJson(stateFile, { ...current, ...patch, updatedAt: now() });
}
