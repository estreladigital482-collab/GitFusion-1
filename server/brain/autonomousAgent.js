import fs from 'fs-extra';
import path from 'path';
import { makeRunId, saveBrainRun, readBrainRun } from './brainState.js';
import { saveProgress } from './brainProgress.js';
import { scanWorkspace, getActiveWorkspaceRoot } from './projectScanner.js';
import { planRealActions } from './actionPlanner.js';
import { executeRealActions } from './realExecutor.js';
import { createSnapshot, restoreSnapshot } from './rollback.js';
import { perceive } from './perception.js';
import { receiveSignal } from './receptors.js';
import { buildPlan, estimatePlanMinutes } from './planner.js';
import { safetyGate } from './safety.js';
import { recordBrainLearning } from './reward.js';

const MAX_CYCLES = 4;

export async function runAutonomousAgent(input = {}) {
  const runId = makeRunId();
  const signal = receiveSignal(input);
  const perception = perceive(signal);
  const projectId = signal.projectId || 'general';
  const root = await getActiveWorkspaceRoot(projectId);
  await createSnapshot(root, runId);

  const plan = buildPlan({ signal, perception, context: '' });
  const safety = safetyGate({ perception, signal });
  const approved = Boolean(input.approved || input.execute);
  const cycles = [];
  let progress = 0;
  let finalStatus = 'running';
  let failure = null;

  await saveProgress(runId, { stage: 'autonomous-start', percent: 3, current: 'Criando snapshot seguro', plan });

  for (let cycle = 1; cycle <= (input.maxCycles || MAX_CYCLES); cycle++) {
    const scan = await scanWorkspace(projectId);
    const generated = buildDeterministicAgentResponse({ signal, perception, scan, cycle });
    const actions = buildAutonomousActions({ signal, perception, scan, cycle, generated });
    await saveProgress(runId, { stage: 'autonomous-cycle', percent: Math.min(90, 8 + cycle * 18), current: `Ciclo ${cycle}: ${actions.length} ação(ões)`, scan: scan.summary, actions });

    const execution = await executeRealActions({
      actions,
      projectId,
      approved,
      runId,
      onProgress: (p) => saveProgress(runId, { ...p, cycle, stage: `cycle-${cycle}` })
    });
    const verification = await verifyWorkspace({ projectId, signal, perception, execution });
    cycles.push({ cycle, scan: scan.summary, actions, execution, verification });
    progress = Math.min(95, 20 + cycle * 22);

    if (verification.ok) { finalStatus = 'completed'; break; }
    failure = verification;

    if (!approved && verification.needsApproval) { finalStatus = 'waiting-approval'; break; }
  }

  if (finalStatus === 'running') finalStatus = failure ? 'partial' : 'completed';
  if (input.rollbackOnFail && finalStatus !== 'completed') await restoreSnapshot(root, runId);

  const answer = formatAutonomousAnswer({ signal, perception, cycles, finalStatus, root, progress });
  const learning = await recordBrainLearning({ signal, perception, plan, answer, provider: 'gitfusion', model: 'autonomous-agent-v1', context: cycles.map(c => c.scan).join('\n'), actions: cycles.flatMap(c => c.actions || []), execution: { real: { ok: finalStatus === 'completed', results: cycles.flatMap(c => c.execution?.results || []) } }, runId });
  const run = await saveBrainRun({
    id: runId,
    createdAt: new Date().toISOString(),
    type: 'autonomous-agent',
    signal,
    perception,
    plan,
    estimateMinutes: Math.max(estimatePlanMinutes(plan, perception), cycles.length * 2),
    progress: finalStatus === 'completed' ? 100 : progress,
    safety: { ...safety, approved },
    root,
    cycles,
    learning,
    answer,
    finalStatus
  });
  await saveProgress(runId, { stage: finalStatus, percent: run.progress, current: finalStatus === 'completed' ? 'Agente concluiu' : 'Agente parou com pendência', runId, answer });
  return run;
}

function buildDeterministicAgentResponse({ signal, perception, scan, cycle }) {
  return {
    provider: 'gitfusion',
    model: 'deterministic-mobile-agent',
    text: `Ciclo ${cycle}: ${perception.intent}. Workspace analisado: ${scan.summary}`
  };
}

function buildAutonomousActions({ signal, perception, scan, cycle, generated }) {
  const lower = String(signal.prompt || '').toLowerCase();
  const plan = buildPlan({ signal, perception, context: scan.summary });
  const safety = safetyGate({ perception, signal });
  const base = planRealActions({ signal, perception, plan, generated, safety });
  const actions = [];

  if (cycle === 1) {
    actions.push({ type: 'mkdir', title: 'Criar pasta de controle do agente', path: '.gitfusion-agent' });
    actions.push({ type: 'write_file', title: 'Salvar contexto analisado pelo agente', path: `.gitfusion-agent/context-${Date.now()}.md`, content: `# Contexto do agente\n\nPedido: ${signal.prompt}\n\n${scan.summary}\n`, overwrite: true });
  }

  if (lower.includes('corrig') || lower.includes('erro') || lower.includes('bug')) {
    actions.push({ type: 'write_file', title: 'Criar relatório real de correção', path: `.gitfusion-agent/fix-plan-${Date.now()}.md`, content: buildFixPlan(signal, scan), overwrite: true });
  }

  if (lower.includes('juntar') || lower.includes('mesclar') || lower.includes('merge') || perception.intent === 'merge_projects') {
    actions.push({ type: 'mkdir', title: 'Criar área de merge autônomo', path: 'merge-workspace' });
    actions.push({ type: 'write_file', title: 'Criar checklist de merge real', path: `merge-workspace/autonomous-merge-${Date.now()}.md`, content: buildMergeChecklist(signal, scan), overwrite: true });
  }

  if (lower.includes('crie') || lower.includes('criar') || lower.includes('gerar')) {
    actions.push(...base.filter(a => ['create_project_structure','create_brain_report'].includes(a.type)));
  } else {
    actions.push(...base.filter(a => a.type === 'create_brain_report'));
  }

  actions.push({ type: 'list_workspace', title: 'Verificar workspace após ações', path: '.' });
  return dedupeActions(actions);
}

function dedupeActions(actions) {
  const seen = new Set();
  return actions.filter(a => { const key = `${a.type}:${a.path || a.title}`; if (seen.has(key)) return false; seen.add(key); return true; });
}

function buildFixPlan(signal, scan) {
  return `# Plano de correção GitFusion\n\nPedido: ${signal.prompt}\n\n## Leitura do workspace\n${scan.summary}\n\n## Processo real\n- Localizar erro por logs ou arquivos citados\n- Fazer alteração mínima\n- Rodar comando seguro de validação quando aprovado\n- Registrar solução na memória\n`;
}
function buildMergeChecklist(signal, scan) {
  return `# Checklist de merge autônomo\n\nPedido: ${signal.prompt}\n\nWorkspace: ${scan.summary}\n\n## Etapas\n- Identificar projetos origem\n- Escolher base principal\n- Copiar módulos sem sobrescrever sem análise\n- Detectar package.json e conflitos\n- Criar relatório de decisões\n- Validar estrutura final\n`;
}

async function verifyWorkspace({ projectId, signal, perception, execution }) {
  const scan = await scanWorkspace(projectId);
  const okActions = execution.results.filter(r => r.ok).length;
  const failed = execution.results.filter(r => !r.ok);
  const hasAgentTrace = scan.files.some(f => f.path.startsWith('.gitfusion-agent/')) || scan.files.some(f => f.path.startsWith('brain-runs/'));
  const ok = okActions > 0 && failed.length === 0 && hasAgentTrace;
  return { ok, okActions, failed, scan: scan.summary, needsApproval: failed.some(f => /aprovação|exige/.test(f.error || '')) };
}

function formatAutonomousAnswer({ signal, perception, cycles, finalStatus, root, progress }) {
  const last = cycles[cycles.length - 1];
  const totalActions = cycles.reduce((n, c) => n + (c.actions?.length || 0), 0);
  const okActions = cycles.reduce((n, c) => n + (c.execution?.results || []).filter(r => r.ok).length, 0);
  return `🤖 GitFusion Autonomous Agent\n\nStatus: ${finalStatus}\nIntenção: ${perception.intent}\nProgresso: ${finalStatus === 'completed' ? 100 : progress}%\nCiclos: ${cycles.length}\nAções reais: ${okActions}/${totalActions}\nWorkspace: ${root}\n\nÚltima verificação:\n${last?.verification?.scan || 'sem verificação'}\n\nPedido original:\n${signal.prompt}`;
}

export async function getAutonomousRun(id) {
  return readBrainRun(id);
}
