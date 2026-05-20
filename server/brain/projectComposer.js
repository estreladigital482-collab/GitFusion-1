export function composeProjectMergeRecipe({ repos = [], prompt = '', perception = {} }) {
  const normalized = repos.map((repo, index) => normalizeRepo(repo, index));
  const base = normalized[0] || null;
  const satellites = normalized.slice(1);
  const recipe = {
    type: 'merge_recipe',
    prompt,
    baseProject: base,
    satellites,
    repoCount: normalized.length,
    strategy: chooseStrategy(normalized, prompt),
    checkpoints: [],
    risks: [],
    output: {
      zip: true,
      workspace: true,
      githubReady: /github|publicar|push/i.test(prompt)
    }
  };

  recipe.checkpoints = [
    'Inventariar arquivos e dependências',
    'Escolher projeto base',
    'Separar módulos reaproveitáveis',
    'Detectar conflitos de rotas, estilos e package.json',
    'Aplicar fusão em branch/backup',
    'Rodar install/start/test quando possível',
    'Salvar relatório e memória da fusão'
  ];

  if (normalized.length < 2 && perception.intent === 'merge_projects') recipe.risks.push('Faltam pelo menos dois repositórios para mesclar.');
  if (normalized.some(r => !r.url && !r.name)) recipe.risks.push('Há repositório sem URL/nome identificável.');
  if (/sobrescrever|apagar|deletar/i.test(prompt)) recipe.risks.push('Pedido pode sobrescrever arquivos. Exige confirmação.');
  return recipe;
}

export function mergeRecipeToText(recipe) {
  const repos = [recipe.baseProject, ...recipe.satellites].filter(Boolean);
  return [
    `Estratégia de fusão: ${recipe.strategy}`,
    `Projeto base: ${recipe.baseProject?.name || 'não definido'}`,
    `Repositórios: ${repos.map(r => r.name || r.url).join(', ') || 'nenhum'}`,
    'Checkpoints:',
    ...recipe.checkpoints.map(c => `- ${c}`),
    recipe.risks.length ? 'Riscos:' : '',
    ...recipe.risks.map(r => `- ${r}`)
  ].filter(Boolean).join('\n');
}

function normalizeRepo(repo, index) {
  if (typeof repo === 'string') return { index, url: repo, name: nameFromUrl(repo) };
  return { index, url: repo.url || repo.html || '', name: repo.repo || repo.name || nameFromUrl(repo.url || repo.html || '') || `repo-${index + 1}`, stack: repo.stack || [], fileCount: repo.fileCount || 0 };
}

function nameFromUrl(url = '') {
  const clean = String(url).replace(/\.git$/, '').split('/').filter(Boolean);
  return clean[clean.length - 1] || '';
}

function chooseStrategy(repos, prompt) {
  if (/manter visual|preservar ui|interface/i.test(prompt)) return 'base_visual_primeiro';
  if (/backend|api|servidor/i.test(prompt)) return 'backend_como_base';
  if (repos.length > 2) return 'hub_and_spokes';
  return 'base_plus_modules';
}
