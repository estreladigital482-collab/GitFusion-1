import { createNeuron } from './memoryNeuron.js';
import { connect } from './synapses.js';
import { placeMemoryObject } from './spatialMemory.js';
import { logBrainEvent } from './brainJournal.js';
import { tokens } from './utils.js';

function splitStudyBlocks(text='', max=900) {
  const raw = String(text || '').split(/\n{2,}|(?=^#{1,3}\s)/m).map(x => x.trim()).filter(Boolean);
  const blocks = [];
  for (const part of raw.length ? raw : [String(text || '')]) {
    if (part.length <= max) blocks.push(part);
    else for (let i=0;i<part.length;i+=max) blocks.push(part.slice(i, i+max));
  }
  return blocks.slice(0, 80);
}

export async function studyContent({ title='Estudo GitFusion', content='', source='manual-study', projectId='', workspaceId='default', roomName='Estudos' } = {}) {
  const blocks = splitStudyBlocks(content);
  const root = await createNeuron({ type: 'study-root', title, content: String(content).slice(0, 1500), source, projectId, tags: ['study','root'] });
  await placeMemoryObject({ roomName, objectType: 'study-root', title, content: String(content).slice(0, 1500), neuronId: root.id, projectId, workspaceId, tags: ['study'] });

  const neurons = [];
  for (const [index, block] of blocks.entries()) {
    const vector = tokens(block);
    const tags = ['study-block', ...vector.slice(0, 6)];
    const n = await createNeuron({ type: 'study-block', title: `${title} · bloco ${index+1}`, content: block, source, projectId, tags });
    await connect(root.id, n.id, { type: 'contains', weight: 1.2, reason: 'estudo persistente' });
    await placeMemoryObject({ roomName, objectType: 'study-block', title: n.title, content: block, neuronId: n.id, projectId, workspaceId, tags });
    neurons.push(n);
  }

  await logBrainEvent({ type: 'study', title: 'Estudo persistente registrado', content: `${neurons.length} blocos estudados para ${title}.`, projectId, workspaceId, metadata: { rootNeuronId: root.id, blocks: neurons.length } });
  return { root, neurons, blocks: neurons.length };
}
