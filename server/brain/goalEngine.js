export function createGoalBlueprint({ signal, perception, plan = [] }) {
  const text = String(signal.prompt || '');
  const wantsApp = /app|apk|android|pwa|mobile|celular/i.test(text);
  const wantsAI = /ia|ai|modelo|brain|c[eé]rebro|rag|mem[oó]ria/i.test(text);
  const wantsCode = /c[oó]digo|program|implementar|criar|corrigir|projeto/i.test(text);
  const wantsMerge = perception.intent === 'merge_projects' || /juntar|mesclar|unir|fusionar|merge/i.test(text);
  const goalType = wantsMerge ? 'project_merge' : wantsAI ? 'ai_builder' : wantsCode ? 'code_builder' : 'assistant';

  const milestones = [];
  milestones.push(milestone('context', 'Entender contexto', 'Ler pedido, projeto atual, histórico, anexos e links.', 10));
  milestones.push(milestone('memory', 'Consultar memória', 'Usar MemPalace, RAG, wiki e decisões anteriores antes de agir.', 15));
  if (wantsMerge) milestones.push(milestone('merge-map', 'Mapear projetos', 'Comparar stacks, estruturas, arquivos críticos e conflitos.', 25));
  if (wantsAI) milestones.push(milestone('brain-map', 'Mapear IA', 'Escolher módulos do cérebro, modelos gratuitos e fluxo mobile.', 20));
  if (wantsCode || wantsMerge || wantsApp) milestones.push(milestone('implementation-plan', 'Planejar implementação', 'Quebrar o trabalho em tasks pequenas para celular/Termux.', 20));
  milestones.push(milestone('execution', 'Executar por etapas', 'Aplicar alterações supervisionadas, testáveis e reversíveis.', 30));
  milestones.push(milestone('verification', 'Verificar resultado', 'Rodar checagens, revisar logs, salvar erros e sucessos.', 15));
  milestones.push(milestone('learning', 'Gerar aprendizado', 'Salvar dataset, memória forte e próxima recomendação.', 10));

  const totalMinutes = Math.max(5, milestones.reduce((sum, m) => sum + m.estimateMinutes, 0));
  const mobileProfile = classifyMobileWorkload({ wantsAI, wantsCode, wantsMerge, wantsApp, totalMinutes });

  return {
    id: `goal_${Date.now().toString(36)}`,
    type: goalType,
    title: titleFor(goalType),
    prompt: text,
    mobileProfile,
    milestones: milestones.map((m, index) => ({ ...m, index: index + 1, status: index < 2 ? 'done' : 'pending' })),
    totalMinutes,
    canRunFree: true,
    needsHumanApproval: wantsMerge || /apagar|deletar|sobrescrever|publicar|push|token|senha/i.test(text),
    recommendedMode: mobileProfile.tier === 'heavy' ? 'hybrid-free' : 'local-free-first',
    createdAt: new Date().toISOString()
  };
}

export function estimateGoalProgress(goal) {
  if (!goal?.milestones?.length) return 0;
  const done = goal.milestones.filter(m => m.status === 'done').length;
  return Math.round((done / goal.milestones.length) * 100);
}

export function summarizeGoal(goal) {
  const progress = estimateGoalProgress(goal);
  return [
    `Meta: ${goal.title}`,
    `Modo: ${goal.recommendedMode}`,
    `Perfil mobile: ${goal.mobileProfile.label}`,
    `Progresso: ${progress}%`,
    `Tempo estimado total: ${goal.totalMinutes} min`,
    `Aprovação humana: ${goal.needsHumanApproval ? 'sim' : 'não obrigatória'}`
  ].join('\n');
}

function milestone(id, title, description, estimateMinutes) {
  return { id, title, description, estimateMinutes };
}

function titleFor(type) {
  return {
    project_merge: 'Juntar projetos até finalizar',
    ai_builder: 'Construir IA operacional do GitFusion',
    code_builder: 'Programar tarefa com IA estruturada',
    assistant: 'Responder com memória e planejamento'
  }[type] || 'Meta GitFusion';
}

function classifyMobileWorkload({ wantsAI, wantsCode, wantsMerge, wantsApp, totalMinutes }) {
  let score = 0;
  if (wantsAI) score += 2;
  if (wantsCode) score += 1;
  if (wantsMerge) score += 3;
  if (wantsApp) score += 1;
  if (totalMinutes > 90) score += 2;
  if (score >= 5) return { tier: 'heavy', label: 'Pesado para celular', advice: 'Rodar por etapas curtas, com modelos pequenos e RAG forte.' };
  if (score >= 3) return { tier: 'medium', label: 'Médio para celular', advice: 'Funciona melhor com execução supervisionada e checkpoints.' };
  return { tier: 'light', label: 'Leve para celular', advice: 'Pode rodar bem com cérebro simbólico e modelo pequeno.' };
}
