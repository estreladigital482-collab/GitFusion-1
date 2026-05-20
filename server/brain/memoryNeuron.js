import { neuronsFile, readBrainJson, writeBrainJson, id, now, tokens } from './utils.js';

export async function createNeuron({ type='memory', title='Memória', content='', source='manual', projectId='', tags=[] } = {}) {
  const neurons = await readBrainJson(neuronsFile, []);
  const neuron = {
    id: id('neuron'), type, title, content, source, projectId,
    tags: Array.isArray(tags) ? tags : [],
    vector: tokens([title, content, tags.join(' ')].join('\n')),
    strength: 1,
    accessCount: 0,
    createdAt: now(), updatedAt: now(), lastAccessAt: null,
  };
  neurons.unshift(neuron);
  await writeBrainJson(neuronsFile, neurons.slice(0, 5000));
  return neuron;
}

export async function listNeurons({ projectId='', type='', limit=100 } = {}) {
  const neurons = await readBrainJson(neuronsFile, []);
  return neurons.filter(n => (!projectId || n.projectId === projectId) && (!type || n.type === type)).slice(0, Number(limit) || 100);
}

export async function strengthenNeuron(neuronId, amount=0.1) {
  const neurons = await readBrainJson(neuronsFile, []);
  const n = neurons.find(x => x.id === neuronId);
  if (!n) return null;
  n.strength = Math.min(10, Number(n.strength || 1) + amount);
  n.accessCount = Number(n.accessCount || 0) + 1;
  n.lastAccessAt = now();
  n.updatedAt = now();
  await writeBrainJson(neuronsFile, neurons);
  return n;
}
