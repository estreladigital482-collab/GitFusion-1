import { synapsesFile, readBrainJson, writeBrainJson, id, now } from './utils.js';

export async function connect(from, to, { type='association', weight=1, reason='' } = {}) {
  if (!from || !to || from === to) return null;
  const synapses = await readBrainJson(synapsesFile, []);
  const existing = synapses.find(s => s.from === from && s.to === to && s.type === type);
  if (existing) {
    existing.weight = Math.min(10, Number(existing.weight || 1) + weight);
    existing.updatedAt = now();
    await writeBrainJson(synapsesFile, synapses);
    return existing;
  }
  const synapse = { id: id('synapse'), from, to, type, weight, reason, createdAt: now(), updatedAt: now() };
  synapses.unshift(synapse);
  await writeBrainJson(synapsesFile, synapses.slice(0, 10000));
  return synapse;
}

export async function relatedTo(neuronId, limit=20) {
  const synapses = await readBrainJson(synapsesFile, []);
  return synapses.filter(s => s.from === neuronId || s.to === neuronId)
    .sort((a,b)=>Number(b.weight||0)-Number(a.weight||0)).slice(0, limit);
}
