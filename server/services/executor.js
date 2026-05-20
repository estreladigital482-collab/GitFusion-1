import { nanoid } from 'nanoid';
import { readJson, writeJson } from './store.js';
import { createTask, updateTask, listTasks } from './tasks.js';

function now(){ return new Date().toISOString(); }

const DEFAULT_STEPS = [
  { key:'understand', title:'Entender o projeto', description:'Ler os repositórios selecionados e identificar objetivo, stack e arquitetura.', weight:12, estimateMinutes:3 },
  { key:'plan', title:'Criar plano de fusão', description:'Gerar uma lista de tarefas com direção técnica para aprovação.', weight:14, estimateMinutes:4 },
  { key:'analyze', title:'Analisar conflitos', description:'Comparar estruturas, dependências, scripts e possíveis colisões de arquivos.', weight:18, estimateMinutes:6 },
  { key:'merge', title:'Mesclar projeto', description:'Criar a estrutura final preservando base, imports e relatório técnico.', weight:26, estimateMinutes:10 },
  { key:'document', title:'Atualizar Wiki e Memória', description:'Registrar decisões, arquitetura e entendimento do projeto.', weight:16, estimateMinutes:4 },
  { key:'export', title:'Preparar exportação', description:'Preparar ZIP final e próximos passos de publicação.', weight:14, estimateMinutes:3 }
];

async function db(projectId){ return await readJson('executions', projectId, { executions: [] }); }
async function save(projectId, data){ await writeJson('executions', projectId, data); }

function estimate(steps){ return steps.reduce((sum, s)=>sum + Number(s.estimateMinutes || 0), 0); }

export async function createExecution(projectId, input = {}) {
  const data = await db(projectId);
  const steps = (input.steps && input.steps.length ? input.steps : DEFAULT_STEPS).map((s, index)=>({
    id: s.id || nanoid(8),
    key: s.key || `step-${index+1}`,
    title: s.title || `Etapa ${index+1}`,
    description: s.description || '',
    status: index === 0 ? 'running' : 'pending',
    progress: index === 0 ? 5 : 0,
    weight: Number(s.weight || 10),
    estimateMinutes: Number(s.estimateMinutes || 3),
    approved: s.approved ?? false,
  }));
  const execution = {
    id: nanoid(10),
    projectId,
    title: input.title || 'Construção do projeto',
    status: 'waiting_approval',
    mode: input.mode || 'fusion',
    progress: 0,
    currentStep: steps[0]?.id || null,
    estimateMinutes: estimate(steps),
    steps,
    logs: [
      { at: now(), type:'system', text:'Plano criado. Aguarde aprovação das tarefas para iniciar.' },
      { at: now(), type:'thought', text:'Vou primeiro entender os repositórios, depois planejar a fusão, detectar conflitos, mesclar e documentar.' }
    ],
    createdAt: now(),
    updatedAt: now(),
    startedAt: null,
    finishedAt: null,
  };
  data.executions.unshift(execution);
  await save(projectId, data);

  for (const step of steps) {
    await createTask(projectId, {
      title: step.title,
      description: step.description,
      status: 'pending_approval',
      progress: 0,
      estimateMinutes: step.estimateMinutes,
      executionId: execution.id,
      stepId: step.id,
    });
  }
  return execution;
}

export async function listExecutions(projectId) {
  const data = await db(projectId);
  return data.executions || [];
}

export async function getExecution(projectId, executionId) {
  const data = await db(projectId);
  const execution = (data.executions || []).find(e => e.id === executionId);
  if (!execution) return null;
  return refreshExecution(execution);
}

function refreshExecution(execution) {
  if (!execution.startedAt || ['paused','cancelled','completed','waiting_approval'].includes(execution.status)) return execution;
  const elapsedSeconds = Math.max(0, (Date.now() - new Date(execution.startedAt).getTime()) / 1000);
  const totalSeconds = Math.max(20, (execution.estimateMinutes || 1) * 60);
  const targetProgress = Math.min(99, Math.floor((elapsedSeconds / totalSeconds) * 100));
  if (targetProgress > execution.progress) execution.progress = targetProgress;

  let accumulated = 0;
  const totalWeight = execution.steps.reduce((s,x)=>s + x.weight, 0) || 1;
  for (const step of execution.steps) {
    const start = accumulated;
    const end = accumulated + (step.weight / totalWeight) * 100;
    accumulated = end;
    if (execution.progress >= end) {
      step.status = 'done'; step.progress = 100;
    } else if (execution.progress >= start) {
      step.status = 'running';
      step.progress = Math.max(5, Math.floor(((execution.progress - start) / Math.max(1, end - start)) * 100));
      execution.currentStep = step.id;
    } else if (step.status !== 'done') {
      step.status = 'pending'; step.progress = 0;
    }
  }

  if (execution.progress >= 99) {
    execution.progress = 100;
    execution.status = 'completed';
    execution.finishedAt = execution.finishedAt || now();
    execution.steps.forEach(s=>{s.status='done'; s.progress=100;});
    if (!execution.logs.some(l => l.type === 'done')) execution.logs.push({ at: now(), type:'done', text:'Execução concluída. Projeto pronto para revisar, salvar e exportar.' });
  }
  execution.updatedAt = now();
  return execution;
}

export async function approveExecution(projectId, executionId, approvedStepIds = []) {
  const data = await db(projectId);
  const execution = data.executions.find(e => e.id === executionId);
  if (!execution) throw new Error('Execução não encontrada.');
  const approved = new Set(approvedStepIds.length ? approvedStepIds : execution.steps.map(s=>s.id));
  execution.steps.forEach(s => s.approved = approved.has(s.id));
  execution.logs.push({ at: now(), type:'approval', text:`${approved.size} tarefa(s) aprovada(s).` });
  execution.updatedAt = now();
  await save(projectId, data);
  return execution;
}

export async function startExecution(projectId, executionId) {
  const data = await db(projectId);
  const execution = data.executions.find(e => e.id === executionId);
  if (!execution) throw new Error('Execução não encontrada.');
  const approvedCount = execution.steps.filter(s=>s.approved).length;
  if (!approvedCount) throw new Error('Aprove pelo menos uma tarefa antes de iniciar.');
  execution.status = 'running';
  execution.startedAt = execution.startedAt || now();
  execution.logs.push({ at: now(), type:'start', text:'Execução iniciada. Vou trabalhar etapa por etapa e registrar o progresso aqui.' });
  execution.logs.push({ at: now(), type:'thought', text:'Enquanto trabalho, vou manter histórico, progresso e próximos passos para você revisar.' });
  execution.updatedAt = now();
  await save(projectId, data);
  return execution;
}

export async function pauseExecution(projectId, executionId) {
  const data = await db(projectId);
  const execution = data.executions.find(e => e.id === executionId);
  if (!execution) throw new Error('Execução não encontrada.');
  refreshExecution(execution);
  execution.status = 'paused';
  execution.logs.push({ at: now(), type:'pause', text:'Execução pausada pelo usuário.' });
  execution.updatedAt = now();
  await save(projectId, data);
  return execution;
}

export async function cancelExecution(projectId, executionId) {
  const data = await db(projectId);
  const execution = data.executions.find(e => e.id === executionId);
  if (!execution) throw new Error('Execução não encontrada.');
  execution.status = 'cancelled';
  execution.logs.push({ at: now(), type:'cancel', text:'Execução cancelada pelo usuário.' });
  execution.updatedAt = now();
  await save(projectId, data);
  return execution;
}

export async function appendExecutionLog(projectId, executionId, log) {
  const data = await db(projectId);
  const execution = data.executions.find(e => e.id === executionId);
  if (!execution) throw new Error('Execução não encontrada.');
  execution.logs.push({ at: now(), type: log.type || 'log', text: log.text || '' });
  execution.updatedAt = now();
  await save(projectId, data);
  return execution;
}
