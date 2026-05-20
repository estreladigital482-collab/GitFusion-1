export function perceive(signal) {
  const text = String(signal.prompt || '').toLowerCase();
  const repoCount = signal.repos?.length || 0;
  let intent = 'explain';
  if (/junt|mescl|merge|fundir|fusionar|reposit[oó]rio/.test(text) || repoCount >= 2) intent = 'merge_projects';
  else if (/cria|crie|criar|ger[aá]|faz|fazer|implement|cod|program|arquivo|tela|app|apk|projeto/.test(text)) intent = 'code_task';
  else if (/erro|bug|corrig|consert|falh|npm|stack|log/.test(text)) intent = 'debug';
  else if (/planej|etapa|task|tempo|estim/.test(text)) intent = 'plan';

  const risk = /rm -rf|delete|apagar tudo|token|senha|sudo|chmod|curl .*sh/.test(text) ? 'high' : 'normal';
  const complexity = repoCount >= 2 || text.length > 420 ? 'high' : text.length > 160 ? 'medium' : 'low';

  return {
    intent,
    risk,
    complexity,
    needsApproval: risk === 'high' || ['merge_projects', 'code_task', 'debug'].includes(intent),
    summary: summarize(signal.prompt, intent, repoCount),
    signals: {
      repoCount,
      hasAttachments: (signal.attachments || []).length > 0,
      wantsCode: /cod|program|implement|arquivo|tela|app/.test(text),
      wantsMerge: intent === 'merge_projects',
      wantsAndroid: /apk|android|celular|mobile/.test(text)
    }
  };
}

function summarize(prompt, intent, repoCount) {
  const label = {
    merge_projects: 'Mesclar ou juntar projetos',
    code_task: 'Criar/alterar código',
    debug: 'Corrigir erro',
    plan: 'Planejar etapas',
    explain: 'Responder/explicar'
  }[intent] || 'Tarefa geral';
  return `${label}${repoCount ? ` com ${repoCount} repositório(s)` : ''}: ${String(prompt || '').slice(0, 180)}`;
}
