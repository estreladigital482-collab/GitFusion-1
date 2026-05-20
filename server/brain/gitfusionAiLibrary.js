import { buildActionContext } from './ragBeforeAction.js';
import { generateWithLocalModel, resolveLocalModel, listOllamaModels } from './localModelRuntime.js';
import { createRoom, addMemoryObject, searchPalace, listRooms } from './memPalace.js';
import { appendTrainingExample } from './datasetGenerator.js';
import { listLocalModelProfiles } from './modelLibrary.js';

export async function thinkBeforeAct({ prompt, workspaceId = 'default', projectId = 'general', tools = {} }) {
  const room = await createRoom({ workspaceId, projectId, name: projectId });
  const rag = await buildActionContext({
    prompt,
    memorySearch: tools.memorySearch,
    wikiSearch: tools.wikiSearch,
    projectSearch: tools.projectSearch
  });
  const response = await generateWithLocalModel({ prompt, taskText: prompt, context: rag.context });

  await addMemoryObject({
    roomId: room.id,
    type: 'decision',
    title: 'Análise antes de agir',
    content: `Pedido: ${prompt}\n\nResposta: ${response.text}`,
    tags: ['rag', 'thinking', response.provider],
    strength: 2
  });

  await appendTrainingExample({
    workspaceId,
    projectId,
    instruction: prompt,
    input: rag.context,
    output: response.text,
    metadata: { provider: response.provider, model: response.model, stage: 'thinkBeforeAct' }
  });

  return {
    roomId: room.id,
    provider: response.provider,
    model: response.model,
    context: rag.context,
    sources: rag.sources,
    answer: response.text
  };
}

export async function getAiLibraryStatus() {
  const [profiles, ollamaModels, rooms] = await Promise.all([
    listLocalModelProfiles(),
    listOllamaModels(),
    listRooms()
  ]);
  return {
    profiles,
    installedModels: ollamaModels,
    rooms: rooms.map(r => ({ id: r.id, name: r.name, objects: r.objects?.length || 0, updatedAt: r.updatedAt })),
    activeRuntime: ollamaModels.length ? 'ollama' : 'internal-offline'
  };
}

export { searchPalace, appendTrainingExample, resolveLocalModel };
