import { addMemoryObject, createRoom } from './memPalace.js';
import { appendTrainingExample } from './datasetGenerator.js';
import { recordLearningEvent, recordDecision, suggestFromLearning } from './learningMemory.js';

export async function recordBrainLearning({ signal, perception, plan, answer, provider, model, context, actions = [], execution = null, runId = 'pending' }) {
  const room = await createRoom({ workspaceId: signal.workspaceId, projectId: signal.projectId, name: signal.projectId || 'GitFusion Brain' });
  const strength = perception.intent === 'debug' || perception.intent === 'merge_projects' ? 3 : 2;
  await addMemoryObject({
    roomId: room.id,
    type: 'brain-run',
    title: perception.summary || 'Execução do Brain Core',
    content: [`Pedido: ${signal.prompt}`, `Intenção: ${perception.intent}`, `Resposta: ${answer}`].join('\n\n'),
    tags: ['brain-core', perception.intent, provider || 'internal'],
    strength
  });
  await appendTrainingExample({
    workspaceId: signal.workspaceId,
    projectId: signal.projectId,
    instruction: signal.prompt,
    input: context || '',
    output: answer,
    metadata: { intent: perception.intent, provider, model, planSteps: plan.length }
  });

  const ok = execution?.real ? Boolean(execution.real.ok) : true;
  const failed = execution?.real?.results?.filter?.(r => !r.ok) || [];
  const learningEvent = await recordLearningEvent({
    runId,
    workspaceId: signal.workspaceId,
    projectId: signal.projectId || 'general',
    intent: perception.intent,
    prompt: signal.prompt,
    plan,
    actions,
    provider,
    model,
    contextSources: [],
    result: { ok, outcome: ok ? 'success' : 'partial', summary: answer, error: failed[0]?.error },
    metadata: { risk: perception.risk, failedCount: failed.length }
  });
  const decision = await recordDecision({
    runId,
    projectId: signal.projectId || 'general',
    decision: `Executar fluxo ${perception.intent}`,
    reason: `Plano com ${plan.length} etapa(s), modelo ${provider}/${model}.`,
    confidence: learningEvent.pattern.confidence || 0.5,
    risk: perception.risk,
    tags: ['brain-core', perception.intent]
  });
  const suggestions = await suggestFromLearning({ projectId: signal.projectId || 'general', intent: perception.intent });
  return { roomId: room.id, learningEvent, decision, suggestions };
}
