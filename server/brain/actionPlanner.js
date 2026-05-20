function slug(input='projeto') { return String(input).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48) || 'projeto'; }
function now(){ return new Date().toISOString(); }
function extractQuoted(text='') { return [...String(text).matchAll(/["“”']([^"“”']{1,120})["“”']/g)].map(m => m[1]); }
function hasAny(text, words) { const t=String(text).toLowerCase(); return words.some(w => t.includes(w)); }

export function planRealActions({ signal, perception, plan, generated, safety }) {
  const prompt = String(signal.prompt || '');
  const lower = prompt.toLowerCase();
  const actions = [];
  const report = buildReport({ signal, perception, plan, generated, safety });
  actions.push({ type:'create_brain_report', title:'Salvar relatório real da execução', content: report });

  if (hasAny(lower, ['crie projeto', 'criar projeto', 'novo projeto', 'gerar projeto', 'scaffold', 'estrutura'])) {
    const name = extractQuoted(prompt)[0] || prompt.match(/(?:projeto|app|sistema)\s+([a-zA-Z0-9_-]{3,40})/i)?.[1] || 'gitfusion-generated-project';
    actions.push({
      type:'create_project_structure',
      title:'Criar estrutura real de projeto no workspace',
      path: slug(name),
      files:[
        { path:'README.md', content:`# ${name}\n\nCriado pelo GitFusion Brain em ${now()}.\n\n## Pedido original\n${prompt}\n` },
        { path:'docs/brain-plan.md', content: report },
        { path:'src/.gitkeep', content:'' }
      ]
    });
  }

  if (perception.intent === 'merge_projects' || hasAny(lower, ['juntar projeto', 'mesclar projeto', 'merge', 'fundir'])) {
    actions.push({ type:'mkdir', title:'Criar área real de fusão', path:'merge-workspace' });
    actions.push({ type:'write_file', title:'Salvar plano de fusão real', path:`merge-workspace/merge-plan-${Date.now()}.md`, content: buildMergePlan(signal, plan), overwrite:true });
  }

  if (hasAny(lower, ['listar workspace', 'ver arquivos', 'mostrar arquivos'])) actions.push({ type:'list_workspace', title:'Listar workspace', path:'.' });

  return actions;
}

function buildReport({ signal, perception, plan, generated, safety }) {
  return `# GitFusion Brain Run\n\n- Data: ${now()}\n- Intenção: ${perception.intent}\n- Complexidade: ${perception.complexity}\n- Risco: ${perception.risk}\n- Segurança: ${safety.mode}\n- Modelo: ${generated.provider}/${generated.model}\n\n## Pedido\n${signal.prompt}\n\n## Etapas\n${plan.map(s => `- [${s.status === 'done' ? 'x' : ' '}] ${s.index}. ${s.title} (${s.estimateMinutes}min) - ${s.description}`).join('\n')}\n\n## Resposta\n${generated.text}\n`;
}
function buildMergePlan(signal, plan) {
  const repos = (signal.repos || []).map(r => r.url || `${r.owner || ''}/${r.repo || ''}`.replace(/^\//,'')).filter(Boolean);
  return `# Plano de Fusão GitFusion\n\nCriado em ${now()}\n\n## Repositórios\n${repos.length ? repos.map(r => `- ${r}`).join('\n') : '- Nenhum repositório anexado ainda.'}\n\n## Estratégia\n${plan.map(s => `- ${s.title}: ${s.description}`).join('\n')}\n\n## Próximo passo real\nUse a tela de fusão do GitFusion para analisar e gerar o ZIP mesclado, ou adicione os repositórios no chat antes de pedir a fusão.\n`;
}
