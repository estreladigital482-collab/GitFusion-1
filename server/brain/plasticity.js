import { neuronsFile, synapsesFile, readBrainJson, writeBrainJson, now } from './utils.js';

export async function applyPlasticity({ relatedNeuronIds=[], rewardScore=0, attention=0.5, reason='plasticidade' } = {}) {
  const neurons = await readBrainJson(neuronsFile, []);
  const synapses = await readBrainJson(synapsesFile, []);
  const delta = Math.max(-0.4, Math.min(0.6, (Number(rewardScore || 0) * 0.2) + (Number(attention || 0.5) * 0.08)));
  const touched = [];

  for (const id of relatedNeuronIds.filter(Boolean)) {
    const n = neurons.find(x => x.id === id);
    if (!n) continue;
    n.strength = Math.max(0.1, Math.min(10, Number(n.strength || 1) + delta));
    n.plasticity = { lastDelta: delta, reason, updatedAt: now() };
    n.updatedAt = now();
    touched.push(n.id);
  }

  for (const s of synapses) {
    if (relatedNeuronIds.includes(s.from) || relatedNeuronIds.includes(s.to)) {
      s.weight = Math.max(0.1, Math.min(10, Number(s.weight || 1) + delta / 2));
      s.updatedAt = now();
      s.lastPlasticityReason = reason;
    }
  }

  await writeBrainJson(neuronsFile, neurons);
  await writeBrainJson(synapsesFile, synapses);
  return { delta, touched, reason };
}

export async function consolidateMemory({ minStrength=1.5 } = {}) {
  const neurons = await readBrainJson(neuronsFile, []);
  const synapses = await readBrainJson(synapsesFile, []);
  const strong = neurons.filter(n => Number(n.strength || 1) >= Number(minStrength));
  const strongIds = new Set(strong.map(n => n.id));
  const activeSynapses = synapses.filter(s => strongIds.has(s.from) || strongIds.has(s.to));
  return {
    strongMemories: strong.length,
    activeSynapses: activeSynapses.length,
    summary: `Memória consolidada: ${strong.length} neurônios fortes e ${activeSynapses.length} sinapses ativas.`
  };
}
