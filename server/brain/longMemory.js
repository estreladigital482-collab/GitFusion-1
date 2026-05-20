import { neuronsFile, readBrainJson, cosineLike, tokens } from './utils.js';
import { strengthenNeuron } from './memoryNeuron.js';

export async function recall(query='', { projectId='', limit=8 } = {}) {
  const q = tokens(query);
  const neurons = await readBrainJson(neuronsFile, []);
  const ranked = neurons
    .filter(n => !projectId || !n.projectId || n.projectId === projectId)
    .map(n => ({ ...n, score: cosineLike(q, n.vector || []) * Number(n.strength || 1) }))
    .filter(n => n.score > 0)
    .sort((a,b)=>b.score-a.score)
    .slice(0, limit);
  await Promise.all(ranked.slice(0, 3).map(n => strengthenNeuron(n.id, 0.05)));
  return ranked;
}

export function memoryToContext(memories=[]) {
  return memories.map((m, i) => `# Memória ${i+1}: ${m.title}\nTipo: ${m.type}\nForça: ${m.strength}\n${String(m.content||'').slice(0, 1200)}`).join('\n\n');
}
