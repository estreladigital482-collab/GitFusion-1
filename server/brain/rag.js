import { ragContext } from '../services/rag.js';
import { recall, memoryToContext } from './longMemory.js';

export async function brainRag(query='', options={}) {
  const memories = await recall(query, options);
  let projectContext = '';
  try {
    const rag = await ragContext(query, { projectId: options.projectId || '', limit: options.limit || 8 });
    projectContext = rag.context || '';
  } catch {}
  return {
    memories,
    context: [memoryToContext(memories), projectContext].filter(Boolean).join('\n\n---\n\n'),
  };
}
