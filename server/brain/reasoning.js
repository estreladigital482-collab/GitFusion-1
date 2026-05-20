import { perceive } from './perception.js';
import { brainRag } from './rag.js';
import { createPlan } from './planner.js';
import { rememberShort } from './workingMemory.js';
import { chooseModel } from './modelRouter.js';

export async function think(signal) {
  const perception = perceive(signal);
  const rag = await brainRag(signal.content, { projectId: signal.projectId, limit: 8 });
  const plan = createPlan(perception, signal, rag.context);
  const model = await chooseModel({ task: perception.primaryIntent });
  rememberShort(signal.workspaceId || 'default', { signal, perception, plan, model });
  return {
    perception,
    contextPreview: rag.context.slice(0, 2000),
    activatedMemories: rag.memories.map(m => ({ id: m.id, title: m.title, type: m.type, score: m.score, strength: m.strength })),
    model,
    plan,
    operationalThoughts: [
      `Intenção principal detectada: ${perception.primaryIntent}`,
      `Risco estimado: ${perception.risk}`,
      `Memórias ativadas: ${rag.memories.length}`,
      `Motor escolhido: ${model.provider}`,
      `Plano criado com ${plan.steps.length} etapas`,
    ],
  };
}
