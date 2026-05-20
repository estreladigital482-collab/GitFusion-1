import fs from 'fs-extra';
import path from 'path';
import { config } from '../config.js';
import { readJson, writeJson } from './store.js';
import { tree } from './repositories.js';

function safeProject(projectId) {
  return String(projectId || 'default').replace(/[^a-z0-9_.-]/gi, '-');
}

function slugify(input) {
  return String(input || 'pagina')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pagina';
}

function wikiDir(projectId) {
  return path.join(config.dataDir, 'wiki', safeProject(projectId));
}
function pagesDir(projectId) {
  return path.join(wikiDir(projectId), 'pages');
}
function pagePath(projectId, slug) {
  return path.join(pagesDir(projectId), `${slugify(slug)}.md`);
}
function now() { return new Date().toISOString(); }

async function ensureWiki(projectId) {
  await fs.ensureDir(pagesDir(projectId));
  const indexPath = path.join(wikiDir(projectId), 'index.json');
  if (!(await fs.pathExists(indexPath))) {
    await fs.writeJson(indexPath, {
      projectId: safeProject(projectId),
      title: 'Wiki do projeto',
      createdAt: now(),
      updatedAt: now(),
      pages: [],
      history: [],
    }, { spaces: 2 });
  }
}

async function readIndex(projectId) {
  await ensureWiki(projectId);
  return fs.readJson(path.join(wikiDir(projectId), 'index.json'));
}
async function writeIndex(projectId, data) {
  await ensureWiki(projectId);
  await fs.writeJson(path.join(wikiDir(projectId), 'index.json'), { ...data, updatedAt: now() }, { spaces: 2 });
}
async function addHistory(projectId, event) {
  const index = await readIndex(projectId);
  index.history = [{ at: now(), ...event }, ...(index.history || [])].slice(0, 80);
  await writeIndex(projectId, index);
}

export async function getWiki(projectId) {
  const legacy = await readJson('wiki', safeProject(projectId), null);
  await ensureWiki(projectId);
  const index = await readIndex(projectId);
  const pages = await listWikiPages(projectId);
  return {
    projectId: safeProject(projectId),
    overview: legacy?.overview || '',
    architecture: legacy?.architecture || '',
    decisions: legacy?.decisions || [],
    generatedAt: legacy?.generatedAt || index.generatedAt || null,
    title: index.title,
    updatedAt: index.updatedAt,
    pages,
    history: index.history || [],
  };
}

export async function updateWiki(projectId, patch = {}) {
  const id = safeProject(projectId);
  const current = await readJson('wiki', id, { projectId: id, overview: '', architecture: '', decisions: [], generatedAt: null });
  const next = { ...current, ...patch, projectId: id, updatedAt: now() };
  await writeJson('wiki', id, next);
  const index = await readIndex(id);
  if (patch.title) index.title = patch.title;
  if (patch.generatedAt) index.generatedAt = patch.generatedAt;
  await writeIndex(id, index);
  await addHistory(id, { type: 'wiki:update', message: 'Wiki principal atualizada.' });
  return getWiki(id);
}

export async function listWikiPages(projectId) {
  const id = safeProject(projectId);
  await ensureWiki(id);
  const files = (await fs.readdir(pagesDir(id))).filter(f => f.endsWith('.md'));
  const index = await readIndex(id);
  const pages = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const full = path.join(pagesDir(id), file);
    const content = await fs.readFile(full, 'utf8');
    const title = (content.match(/^#\s+(.+)$/m)?.[1] || slug).trim();
    const stat = await fs.stat(full);
    pages.push({ slug, title, updatedAt: stat.mtime.toISOString(), size: content.length });
  }
  const order = new Map((index.pages || []).map((p, i) => [p.slug, i]));
  return pages.sort((a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999) || a.title.localeCompare(b.title));
}

export async function getWikiPage(projectId, slug = 'home') {
  const id = safeProject(projectId);
  const safeSlug = slugify(slug);
  const full = pagePath(id, safeSlug);
  if (!(await fs.pathExists(full))) return { projectId: id, slug: safeSlug, title: safeSlug, content: '', exists: false };
  const content = await fs.readFile(full, 'utf8');
  return { projectId: id, slug: safeSlug, title: content.match(/^#\s+(.+)$/m)?.[1] || safeSlug, content, exists: true };
}

export async function saveWikiPage(projectId, slug, content, title) {
  const id = safeProject(projectId);
  const safeSlug = slugify(slug || title || 'pagina');
  await ensureWiki(id);
  const body = String(content || '').trim() || `# ${title || safeSlug}\n\n`;
  await fs.writeFile(pagePath(id, safeSlug), body, 'utf8');
  const index = await readIndex(id);
  const pageTitle = body.match(/^#\s+(.+)$/m)?.[1] || title || safeSlug;
  const existing = (index.pages || []).filter(p => p.slug !== safeSlug);
  index.pages = [...existing, { slug: safeSlug, title: pageTitle, updatedAt: now() }];
  await writeIndex(id, index);
  await addHistory(id, { type: 'page:save', slug: safeSlug, message: `Página salva: ${pageTitle}` });
  return getWikiPage(id, safeSlug);
}

export async function deleteWikiPage(projectId, slug) {
  const id = safeProject(projectId);
  const safeSlug = slugify(slug);
  await fs.remove(pagePath(id, safeSlug));
  const index = await readIndex(id);
  index.pages = (index.pages || []).filter(p => p.slug !== safeSlug);
  await writeIndex(id, index);
  await addHistory(id, { type: 'page:delete', slug: safeSlug, message: `Página removida: ${safeSlug}` });
  return { ok: true };
}

function flattenTree(nodes = [], prefix = '') {
  const out = [];
  for (const node of nodes) {
    const current = prefix ? `${prefix}/${node.name}` : node.name;
    out.push({ ...node, fullPath: current });
    if (node.children) out.push(...flattenTree(node.children, current));
  }
  return out;
}

function mdList(items = []) {
  return items.length ? items.map(x => `- ${x}`).join('\n') : '- Nenhum item detectado ainda.';
}

export async function generateProjectWiki(projectId) {
  const id = safeProject(projectId);
  const project = await readJson('projects', id, { id, name: 'Projeto GitFusion', repos: [], logs: [] });
  const projectDir = path.join(config.workspaceDir, id);
  const treeData = await tree(projectDir, projectDir, 0, 4);
  const flat = flattenTree(treeData);
  const dirs = flat.filter(x => x.type === 'dir').slice(0, 80).map(x => x.fullPath);
  const files = flat.filter(x => x.type === 'file').slice(0, 120).map(x => x.fullPath);
  const repos = project.repos || [];

  await saveWikiPage(id, 'home', `# ${project.name || 'Projeto GitFusion'}\n\n## Resumo\n\nEste projeto foi criado no GitFusion a partir de ${repos.length || 0} repositório(s).\n\n## Repositórios de origem\n\n${mdList(repos.map(r => `${r.owner}/${r.repo} (${r.branch || 'branch detectada'})`))}\n\n## Estado atual\n\n- Status: ${project.status || 'desconhecido'}\n- Progresso: ${project.progress ?? 0}%\n- Criado em: ${project.createdAt || 'não informado'}\n\n## Links internos\n\n- [[Arquitetura]]\n- [[Repositórios]]\n- [[Arquivos principais]]\n- [[Decisões]]\n`, 'Home');

  await saveWikiPage(id, 'arquitetura', `# Arquitetura\n\n## Pastas principais\n\n${mdList(dirs)}\n\n## Leitura inicial\n\nEsta página descreve a arquitetura detectada automaticamente. Nas próximas sessões, o GitFusion vai enriquecer esta wiki usando RAG e análise de código.\n`, 'Arquitetura');

  await saveWikiPage(id, 'repositorios', `# Repositórios\n\n${mdList(repos.map(r => `**${r.owner}/${r.repo}**\n  - URL: ${r.url}\n  - Branch: ${r.branch || 'detectada'}\n  - Nome seguro: ${r.safe || 'n/a'}`))}\n`, 'Repositórios');

  await saveWikiPage(id, 'arquivos-principais', `# Arquivos principais\n\n${mdList(files)}\n`, 'Arquivos principais');

  await saveWikiPage(id, 'decisoes', `# Decisões\n\n## Decisões registradas\n\n${mdList((project.logs || []).map(log => String(log)))}\n\n## Próximas decisões\n\n- Escolher repositório base.\n- Definir estratégia de fusão.\n- Aprovar tasks de modificação.\n`, 'Decisões');

  await updateWiki(id, {
    title: project.name || 'Wiki do projeto',
    overview: `Projeto criado a partir de ${repos.length || 0} repositório(s).`,
    architecture: `Foram detectadas ${dirs.length} pastas e ${files.length} arquivos principais no escopo inicial.`,
    generatedAt: now(),
  });
  await addHistory(id, { type: 'wiki:generate', message: 'Wiki automática gerada a partir do projeto.' });
  return getWiki(id);
}

export async function searchWiki(projectId, query = '') {
  const id = safeProject(projectId);
  const q = String(query || '').toLowerCase().trim();
  const pages = await listWikiPages(id);
  const results = [];
  for (const page of pages) {
    const full = await getWikiPage(id, page.slug);
    const hay = `${full.title}\n${full.content}`.toLowerCase();
    if (!q || hay.includes(q)) {
      const idx = q ? hay.indexOf(q) : 0;
      const excerpt = full.content.slice(Math.max(0, idx - 80), idx + 180).replace(/\n+/g, ' ');
      results.push({ slug: page.slug, title: page.title, excerpt });
    }
  }
  return results;
}
