import fs from 'fs-extra';
import path from 'path';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { importRepos, tree, parseGitHubRepo } from './repositories.js';

const INDEX = path.join(config.dataDir, 'learning', 'index.json');
const MAX_READ = 60000;
const TEXT_EXT = new Set(['.js','.jsx','.ts','.tsx','.json','.md','.css','.html','.py','.java','.kt','.go','.rs','.php','.rb','.yml','.yaml','.env','.txt','.sh','.sql','.c','.cpp','.h','.xml','.gradle','.toml','.lock']);

function safe(input='item') { return String(input).replace(/[^a-z0-9_.-]/gi, '-').replace(/^-+|-+$/g, '') || 'item'; }
async function ensureIndex() {
  await fs.ensureDir(path.dirname(INDEX));
  if (!(await fs.pathExists(INDEX))) await fs.writeJson(INDEX, { sources: [], activeId: '' }, { spaces: 2 });
}
async function readIndex() { await ensureIndex(); return fs.readJson(INDEX); }
async function writeIndex(data) { await ensureIndex(); await fs.writeJson(INDEX, data, { spaces: 2 }); return data; }
export async function listLearningSources() { return readIndex(); }

function sourceRoot(source) {
  if (source.kind === 'project') return path.join(config.workspaceDir, source.projectId);
  return path.join(config.workspaceDir, source.workspaceId || source.id);
}

export async function addLearningSource({ url, projectId, name }) {
  const index = await readIndex();
  const now = new Date().toISOString();
  let source;
  if (projectId) {
    const id = safe(projectId);
    source = { id, kind: 'project', projectId: id, name: name || `Projeto ${id}`, createdAt: now, updatedAt: now };
  } else if (url) {
    const meta = parseGitHubRepo(url);
    const imported = await importRepos([url]);
    source = { id: nanoid(10), kind: 'github', url: meta.url, owner: meta.owner, repo: meta.repo, name: name || `${meta.owner}/${meta.repo}`, workspaceId: imported.projectId, createdAt: now, updatedAt: now };
  } else {
    throw new Error('Informe um link GitHub ou projeto salvo.');
  }
  index.sources = [source, ...(index.sources || []).filter(s => s.id !== source.id)].slice(0, 30);
  index.activeId = source.id;
  await writeIndex(index);
  return { source, index };
}

export async function removeLearningSource(id) {
  const index = await readIndex();
  const item = (index.sources || []).find(s => s.id === id);
  index.sources = (index.sources || []).filter(s => s.id !== id);
  if (index.activeId === id) index.activeId = index.sources[0]?.id || '';
  await writeIndex(index);
  if (item?.kind === 'github' && item.workspaceId) await fs.remove(path.join(config.workspaceDir, item.workspaceId));
  return index;
}

export async function getLearningTree(id) {
  const index = await readIndex();
  const source = (index.sources || []).find(s => s.id === id) || (index.sources || [])[0];
  if (!source) return { source: null, tree: [] };
  const root = sourceRoot(source);
  return { source, tree: await tree(root, root, 0, 5) };
}

function assertSafe(root, rel='') {
  const full = path.resolve(root, rel || '.');
  const resolvedRoot = path.resolve(root);
  if (!full.startsWith(resolvedRoot)) throw new Error('Caminho inválido.');
  return full;
}

export async function readLearningFile(id, relPath='') {
  const { source } = await getLearningTree(id);
  if (!source) throw new Error('Fonte de aprendizado não encontrada.');
  const root = sourceRoot(source);
  const full = assertSafe(root, relPath);
  const stat = await fs.stat(full).catch(() => null);
  if (!stat || stat.isDirectory()) throw new Error('Arquivo não encontrado.');
  const ext = path.extname(full).toLowerCase();
  if (!TEXT_EXT.has(ext) && stat.size > 200000) throw new Error('Arquivo grande/binário demais para leitura.');
  const content = await fs.readFile(full, 'utf8').catch(() => '');
  return { source, path: relPath, size: stat.size, content: content.slice(0, MAX_READ), truncated: content.length > MAX_READ };
}

function detectRole(filePath, content) {
  const name = path.basename(filePath).toLowerCase();
  if (name === 'package.json') return 'manifesto Node.js: dependências, scripts e metadados do projeto';
  if (name.includes('readme')) return 'documentação inicial do projeto';
  if (name.includes('index')) return 'ponto de entrada ou arquivo central';
  if (name.includes('app')) return 'camada principal da aplicação/interface';
  if (name.includes('server')) return 'backend/servidor';
  if (name.includes('route')) return 'rotas/endpoints da aplicação';
  if (name.includes('service')) return 'serviço com regras de negócio';
  if (name.includes('style') || name.endsWith('.css')) return 'estilos visuais e layout';
  if (content.includes('fetch(')) return 'arquivo que faz chamadas HTTP/API';
  if (content.includes('express')) return 'backend Express/Node';
  return 'parte do código do projeto';
}
function importantLines(content='') {
  return content.split('\n').map((line, i) => ({ line: i+1, text: line })).filter(x => /function |const |let |class |export |import |app\.use|router\.|fetch\(|async |return |module\.exports|def |public |private /.test(x.text)).slice(0, 14);
}
export async function explainLearningFile(id, relPath='') {
  const file = await readLearningFile(id, relPath);
  const role = detectRole(relPath, file.content);
  const ext = path.extname(relPath).replace('.', '') || 'texto';
  const lines = importantLines(file.content);
  const explanation = [
    `# Aula: ${relPath}`,
    ``,
    `## O que é este arquivo?`,
    `Este arquivo parece ser ${role}. Ele faz parte do projeto **${file.source.name}** e usa formato/linguagem **${ext}**.`,
    ``,
    `## Como ler este arquivo`,
    `1. Primeiro observe os imports/dependências no topo.`,
    `2. Depois procure funções, classes ou exports principais.`,
    `3. Por fim, veja quais dados entram, quais saem e quais arquivos/serviços ele chama.`,
    ``,
    `## Pontos importantes detectados`,
    ...(lines.length ? lines.map(x => `- Linha ${x.line}: \`${x.text.trim().slice(0, 110)}\``) : ['- Não encontrei linhas estruturais óbvias. Leia por blocos e procure nomes repetidos.']),
    ``,
    `## Explicação de professor`,
    `Pense neste arquivo como uma peça da máquina. A função dele é cumprir uma responsabilidade específica e conversar com outras peças. Se ele importa algo, ele depende dessa peça. Se ele exporta algo, outras partes do projeto dependem dele.`,
    ``,
    `## Exercício rápido`,
    `Explique com suas palavras: qual seria o efeito de remover este arquivo? Que tela, rota ou comportamento deixaria de funcionar?`
  ].join('\n');
  return { ...file, explanation };
}
