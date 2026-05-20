import { receiveSignal } from './receptors.js';
import { perceive } from './perception.js';
import { buildActionContext } from './ragBeforeAction.js';
import { generateWithLocalModel } from './localModelRuntime.js';
import { getMobileRuntimeStatus, chooseMobileModel, runMobileLocalPrompt, getTermuxModelSetupPlan, probeLocalCommands } from './mobileLocalRuntime.js';
import { buildPlan, estimatePlanMinutes, planProgress } from './planner.js';
import { safetyGate } from './safety.js';
import { executeBrainPlan } from './executorBrain.js';
import { planRealActions } from './actionPlanner.js';
import { executeRealActions } from './realExecutor.js';
import { rememberWorking, readWorking } from './workingMemory.js';
import { recordBrainLearning } from './reward.js';
import { makeRunId, saveBrainRun, readBrainRun, listBrainRuns } from './brainState.js';
import { createTask } from '../services/tasks.js';
import { createGoalBlueprint, estimateGoalProgress, summarizeGoal } from './goalEngine.js';
import { composeProjectMergeRecipe, mergeRecipeToText } from './projectComposer.js';
import { getFreeMobileModelPlan } from './modelAdvisor.js';
import { saveProgress, readProgress, listProgress, progressFromSteps } from './brainProgress.js';
import { runAutonomousAgent } from './autonomousAgent.js';
import { getLearningSummary, suggestFromLearning, recordLearningEvent, readLearningEvents } from './learningMemory.js';

export async function runBrain(input = {}) {
  const signal = receiveSignal(input);
  const perception = perceive(signal);
  rememberWorking(signal.chatId, { type: 'signal', prompt: signal.prompt, intent: perception.intent });

  const rag = await buildActionContext({ prompt: signal.prompt });
  const plan = buildPlan({ signal, perception, context: rag.context });
  const goal = createGoalBlueprint({ signal, perception, plan });
  const mergeRecipe = composeProjectMergeRecipe({ repos: signal.repos || [], prompt: signal.prompt, perception });
  const modelPlan = getFreeMobileModelPlan();
  const estimateMinutes = Math.max(estimatePlanMinutes(plan, perception), goal.totalMinutes);
  const progress = Math.max(planProgress(plan), estimateGoalProgress(goal));
  const safety = safetyGate({ perception, signal });
  const stepProgress = progressFromSteps(plan);

  const aiPrompt = buildBrainPrompt({ signal, perception, plan, estimateMinutes, safety, goal, mergeRecipe, modelPlan });
  const generated = await generateWithLocalModel({ prompt: aiPrompt, taskText: signal.prompt, context: rag.context });
  const plannedExecution = await executeBrainPlan({ plan, safety });
  const actions = planRealActions({ signal, perception, plan, generated, safety });
  const runId = makeRunId();
  const realExecution = await executeRealActions({
    actions,
    projectId: signal.projectId || 'general',
    approved: Boolean(input.approved || input.execute),
    runId,
    onProgress: (p) => saveProgress(runId, { ...p, goal, plan })
  });
  const execution = { planned: plannedExecution, real: realExecution };

  const projectId = signal.projectId || 'general';
  const createdTasks = [];
  for (const s of plan.filter(x => !['receive', 'perceive'].includes(x.id))) {
    try {
      const task = await createTask(projectId, {
        title: s.title,
        description: s.description,
        status: s.status === 'done' ? 'done' : 'planned',
        progress: s.status === 'done' ? 100 : 0,
        estimateMinutes: s.estimateMinutes
      });
      createdTasks.push(task);
    } catch {}
  }

  const answer = formatAnswer({ perception, plan, estimateMinutes, progress, safety, generated, createdTasks, goal, mergeRecipe, modelPlan, execution });
  const learning = await recordBrainLearning({ signal, perception, plan, answer, provider: generated.provider, model: generated.model, context: rag.context, actions, execution, runId });
  await saveProgress(runId, { percent: progress, current: stepProgress.current, stage: 'planned', goal, plan, actions });
  const run = await saveBrainRun({
    id: runId,
    createdAt: new Date().toISOString(),
    signal,
    perception,
    plan,
    estimateMinutes,
    progress,
    safety,
    goal,
    mergeRecipe,
    modelPlan,
    stepProgress,
    provider: generated.provider,
    model: generated.model,
    contextSources: rag.sources,
    actions,
    execution,
    tasks: createdTasks,
    learning,
    answer,
    workingMemory: readWorking(signal.chatId)
  });
  await saveProgress(run.id, { percent: 100, current: 'Brain run salvo', stage: 'completed', goal, plan, answer });
  return run;
}

export async function getBrainStatus() {
  const runs = await listBrainRuns(12);
  const local = await getMobileRuntimeStatus();
  const learning = await getLearningSummary({ limit: 5 });
  return {
    ok: true,
    name: 'GitFusion Brain Core',
    mode: process.env.GITFUSION_BRAIN_AUTORUN === 'true' ? 'autorun-enabled' : 'supervised-mobile-safe',
    localRuntime: { mode: local.mode, ready: local.ready, tier: local.platform?.tier, models: local.ollama?.models || [] },
    learning: { totalPatterns: learning.totalPatterns, topPatterns: learning.topPatterns },
    latestRuns: runs.map(r => ({ id: r.id, intent: r.perception?.intent, goal: r.goal?.title, progress: r.progress, estimateMinutes: r.estimateMinutes, createdAt: r.createdAt }))
  };
}

export async function getMobileModelPlan() {
  const local = await getMobileRuntimeStatus();
  return { ok: true, localRuntime: { mode: local.mode, ready: local.ready, tier: local.platform?.tier, installed: local.ollama?.models || [] }, ...getFreeMobileModelPlan() };
}

export async function getLocalRuntime() {
  return getMobileRuntimeStatus();
}

export async function getLocalModelChoice(input = {}) {
  return chooseMobileModel(input.prompt || input.taskText || '');
}

export async function runLocalModel(input = {}) {
  return runMobileLocalPrompt({ prompt: input.prompt || '', taskText: input.taskText || input.prompt || '', context: input.context || '' });
}

export async function getLocalSetupPlan() {
  return getTermuxModelSetupPlan();
}

export async function getLocalCommandProbe() {
  return probeLocalCommands();
}

export async function getBrainProgress(runId) {
  return readProgress(runId);
}

export async function listBrainProgress(limit = 20) {
  return listProgress(limit);
}


export async function getBrainLearningSummary(input = {}) {
  return getLearningSummary({ projectId: input.projectId, limit: Number(input.limit || 10) });
}

export async function getBrainLearningSuggestions(input = {}) {
  return { ok: true, suggestions: await suggestFromLearning({ projectId: input.projectId || 'general', intent: input.intent || 'general', limit: Number(input.limit || 5) }) };
}

export async function addBrainLearningEvent(input = {}) {
  return recordLearningEvent(input);
}

export async function listBrainLearningEvents(input = {}) {
  return { ok: true, events: await readLearningEvents({ limit: Number(input.limit || 30) }) };
}


export async function executeBrainActions(input = {}) {
  const runId = makeRunId();
  const actions = Array.isArray(input.actions) ? input.actions : [];
  const projectId = input.projectId || 'general';
  const execution = await executeRealActions({
    actions,
    projectId,
    approved: Boolean(input.approved),
    runId,
    onProgress: (p) => saveProgress(runId, p)
  });
  const run = await saveBrainRun({
    id: runId,
    createdAt: new Date().toISOString(),
    signal: { prompt: input.prompt || 'execução manual', projectId },
    perception: { intent: 'manual_execution', complexity: 'medium', risk: input.approved ? 'accepted' : 'supervised' },
    plan: actions.map((a, i) => ({ id: a.type || `action-${i+1}`, index: i+1, title: a.title || a.type, description: a.path || a.command || '', status: 'done', estimateMinutes: 1 })),
    estimateMinutes: Math.max(1, actions.length),
    progress: 100,
    safety: { mode: input.approved ? 'approved' : 'mobile-safe', warnings: [] },
    actions,
    execution,
    answer: `Execução real concluída: ${execution.results.filter(r=>r.ok).length}/${execution.count} ações.`
  });
  await saveProgress(runId, { percent: 100, current: 'Execução manual concluída', stage: 'completed', actions });
  return run;
}


export async function runAutonomous(input = {}) {
  return runAutonomousAgent(input);
}

export { readBrainRun, listBrainRuns };

function buildBrainPrompt({ signal, perception, plan, estimateMinutes, safety }) {
  return `Você é o Brain Core do GitFusion, focado em programar, juntar projetos e funcionar no celular.\n\nPedido: ${signal.prompt}\nIntenção: ${perception.intent}\nRisco: ${perception.risk}\nTempo estimado: ${estimateMinutes} minutos\nModo de segurança: ${safety.mode}\n\nEtapas:\n${plan.map(s => `${s.index}. ${s.title}: ${s.description}`).join('\n')}\n\nResponda curto, objetivo, com próximos passos e riscos.`;
}

function formatAnswer({ perception, plan, estimateMinutes, progress, safety, generated, createdTasks, goal, mergeRecipe, modelPlan, execution }) {
  const bar = progressBar(progress);
  const steps = plan.map(s => `${s.status === 'done' ? '✅' : '⬜'} ${s.index}. ${s.title} · ${s.estimateMinutes}min`).join('\n');
  const warnings = safety.warnings.length ? `\n\n⚠️ Segurança:\n${safety.warnings.map(w => `- ${w}`).join('\n')}` : '';
  const taskLine = createdTasks.length ? `\n\nTasks criadas: ${createdTasks.length}` : '';
  const real = execution?.real;
  const realLine = real ? `\nAções reais executadas: ${real.results.filter(r=>r.ok).length}/${real.count}\nWorkspace: ${real.root}` : '';
  const failures = real?.results?.filter(r=>!r.ok) || [];
  const failLine = failures.length ? `\nFalhas reais:\n${failures.map(f=>`- ${f.action?.title || f.action?.type}: ${f.error}`).join('\n')}` : '';
  return `🧠 GitFusion Brain Core\n\nIntenção: ${perception.intent}\nProgresso: ${progress}% ${bar}\nTempo estimado: ${estimateMinutes} min${realLine}${failLine}\nModo: ${safety.mode}\nModelo: ${generated.provider}/${generated.model}\nMeta: ${goal.title}\nModo gratuito: ${goal.recommendedMode}\nModelo sugerido: ${modelPlan.primary[0]?.id || 'offline-symbolic'}\n\nEtapas:\n${steps}${taskLine}${mergeRecipe?.risks?.length ? `\n\nRiscos do projeto:\n${mergeRecipe.risks.map(r=>`- ${r}`).join('\n')}` : ''}${warnings}\n\nResposta do cérebro:\n${generated.text}`;
}

function progressBar(progress) {
  const total = 10;
  const filled = Math.round((progress / 100) * total);
  return `[${'█'.repeat(filled)}${'░'.repeat(total - filled)}]`;
}
