import { receiveSignal } from './receptors.js';
import { think } from './reasoning.js';
import { createNeuron, listNeurons } from './memoryNeuron.js';
import { connect, relatedTo } from './synapses.js';
import { recordReward } from './reward.js';
import { appendDatasetExample, listDatasets } from './datasetBuilder.js';
import { getBrainState, updateBrainState } from './state.js';
import { brainRag } from './rag.js';
import { ensureBrain } from './utils.js';
import { computeAttention, attentionSummary } from './attention.js';
import { logBrainEvent, listBrainEvents } from './brainJournal.js';
import { applyPlasticity, consolidateMemory } from './plasticity.js';
import { ensureRoom, placeMemoryObject, listPalace } from './spatialMemory.js';
import { studyContent } from './autonomousStudy.js';
import { brainArchitecture } from './runtime.js';

export async function brainStatus() {
  await ensureBrain();
  const state = await getBrainState();
  const neurons = await listNeurons({ limit: 5 });
  const datasets = await listDatasets();
  const events = await listBrainEvents({ limit: 5 });
  const palace = await listPalace({});
  return {
    ok: true,
    name: 'GitFusion AI Brain Library',
    version: '14.1',
    state,
    sampleNeurons: neurons,
    recentEvents: events,
    memoryPalace: { rooms: palace.rooms.length, objects: palace.objects.length },
    datasets,
    architecture: brainArchitecture(),
  };
}

export async function processSignal(input) {
  const { signal, neuron } = await receiveSignal(input);
  const result = await think(signal);
  const attention = computeAttention(signal, result.perception);
  const relatedNeuronIds = [neuron.id, ...result.activatedMemories.map(m => m.id)].filter(Boolean);

  await ensureRoom({ name: signal.projectId ? `Projeto ${signal.projectId}` : 'GitFusion Brain', type: 'project', projectId: signal.projectId, workspaceId: signal.workspaceId });
  await placeMemoryObject({
    roomName: signal.projectId ? `Projeto ${signal.projectId}` : 'GitFusion Brain',
    objectType: 'signal',
    title: `Sinal ${result.perception.primaryIntent}`,
    content: signal.content,
    neuronId: neuron.id,
    projectId: signal.projectId,
    workspaceId: signal.workspaceId,
    tags: ['signal', result.perception.primaryIntent, attention.label]
  });

  const plasticity = await applyPlasticity({
    relatedNeuronIds,
    rewardScore: attention.risk > 0.8 ? -0.2 : 0.2,
    attention: attention.importance,
    reason: 'ativação por sinal do usuário'
  });

  const operationalThoughts = [
    ...result.operationalThoughts,
    attentionSummary(attention),
    `Plasticidade aplicada em ${plasticity.touched.length} neurônios relacionados.`,
    'Sinal salvo no palácio de memória do GitFusion.'
  ];

  await logBrainEvent({
    type: 'reasoning-cycle',
    title: `Ciclo neural: ${result.perception.primaryIntent}`,
    content: operationalThoughts.join('\n'),
    signalId: signal.id,
    projectId: signal.projectId,
    workspaceId: signal.workspaceId,
    metadata: { attention, planId: result.plan.id, relatedNeuronIds }
  });

  await updateBrainState({
    lastSignal: signal,
    lastPlan: result.plan,
    lastThoughts: operationalThoughts,
    lastAttention: attention,
    activeSignals: [{ signalId: signal.id, intent: result.perception.primaryIntent, attention: attention.label, at: signal.receivedAt }]
  });

  await appendDatasetExample({
    instruction: 'Processar sinal do usuário no GitFusion Brain',
    input: signal.content,
    output: JSON.stringify({ perception: result.perception, attention, plan: result.plan }, null, 2),
    metadata: { signalId: signal.id, neuronId: neuron.id, version: '14.1' }
  });

  return { signal, neuron, attention, plasticity, ...result, operationalThoughts };
}

export async function study(input={}) {
  return studyContent(input);
}

export async function consolidate(input={}) {
  return consolidateMemory(input);
}

export {
  createNeuron, listNeurons, connect, relatedTo, recordReward, appendDatasetExample, listDatasets,
  brainRag, logBrainEvent, listBrainEvents, applyPlasticity, ensureRoom, placeMemoryObject,
  listPalace, brainArchitecture
};
