export function buildPlan({ signal, perception, context = '' }) {
  const base = [];
  base.push(step('receive', 'Receber pedido', 'Capturar prompt, anexos e estado do projeto.', 5));
  base.push(step('perceive', 'Entender intenção', `Classificar como ${perception.intent}.`, 8));
  base.push(step('memory', 'Buscar memória/RAG', 'Consultar MemPalace, wiki, docs e decisões anteriores.', context ? 10 : 12));

  if (perception.intent === 'merge_projects') {
    base.push(step('analyze_repos', 'Analisar repositórios', 'Ler estrutura, stacks, arquivos críticos e conflitos.', 18));
    base.push(step('merge_strategy', 'Criar estratégia de fusão', 'Definir projeto base, módulos preservados e pontos de conflito.', 15));
    base.push(step('tasks', 'Criar tasks de execução', 'Quebrar a fusão em etapas acompanháveis.', 10));
    base.push(step('safe_execute', 'Execução supervisionada', 'Preparar comandos e alterações com segurança.', 25));
  } else if (perception.intent === 'code_task') {
    base.push(step('inspect_workspace', 'Inspecionar workspace', 'Localizar arquivos prováveis e dependências.', 14));
    base.push(step('design_patch', 'Desenhar alteração', 'Planejar arquivos, funções e UI afetadas.', 14));
    base.push(step('tasks', 'Criar tasks de código', 'Registrar passos antes de alterar.', 9));
    base.push(step('safe_execute', 'Execução supervisionada', 'Aplicar alteração quando houver autorização/ferramenta.', 22));
  } else if (perception.intent === 'debug') {
    base.push(step('read_error', 'Ler erro', 'Extrair causa provável e arquivo afetado.', 12));
    base.push(step('hypothesis', 'Criar hipótese', 'Relacionar erro com histórico/memória.', 12));
    base.push(step('fix_plan', 'Planejar correção', 'Listar correções e testes.', 14));
  } else {
    base.push(step('answer', 'Responder com contexto', 'Gerar resposta usando memória local quando existir.', 12));
  }

  base.push(step('reward', 'Salvar aprendizado', 'Registrar decisão, erro/sucesso e dataset futuro.', 6));
  return base.map((s, index) => ({ ...s, index: index + 1, status: index < 3 ? 'done' : 'pending' }));
}

export function estimatePlanMinutes(steps = [], perception = {}) {
  const factor = perception.complexity === 'high' ? 1.35 : perception.complexity === 'medium' ? 1.1 : 0.85;
  return Math.max(2, Math.round(steps.reduce((sum, s) => sum + (s.estimateMinutes || 0), 0) * factor));
}

export function planProgress(steps = []) {
  if (!steps.length) return 0;
  const done = steps.filter(s => s.status === 'done').length;
  return Math.round((done / steps.length) * 100);
}

function step(id, title, description, estimateMinutes) { return { id, title, description, estimateMinutes }; }
