import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { config } from '../config.js';
import { getWorkspaceState } from '../services/workspace.js';
import { backupFile, restoreSnapshot } from './rollback.js';

const MAX_TEXT_BYTES = 512 * 1024;
const COMMAND_TIMEOUT_MS = 45_000;
const ALLOWED_COMMANDS = new Set(['npm','node','git','ls','pwd','cat']);
const BLOCKED_PATTERNS = [/rm\s+-rf/i, /:\(\)\s*\{\s*:\|:&\s*\}/, /mkfs/i, /dd\s+if=/i, />\s*\/dev\/sd/i, /format/i, /shutdown/i, /reboot/i, /su\b/i, /sudo\b/i];

function now(){ return new Date().toISOString(); }
function safeSegment(input='file') { return String(input).replace(/\\/g,'/').split('/').filter(Boolean).filter(p => p !== '.' && p !== '..').join('/'); }
async function activeRoot(projectId='general') {
  await fs.ensureDir(config.workspaceDir);
  const state = await getWorkspaceState().catch(() => ({ activeId: 'pessoal' }));
  const baseId = safeSegment(projectId === 'general' ? (state.activeId || 'pessoal') : projectId);
  const root = path.join(config.workspaceDir, baseId || 'pessoal');
  await fs.ensureDir(root);
  return root;
}
function assertInside(root, target) {
  const rel = path.relative(root, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Caminho bloqueado fora do workspace.');
}
function textSizeOk(text='') {
  return Buffer.byteLength(String(text), 'utf8') <= MAX_TEXT_BYTES;
}
function normalizeAction(action = {}) {
  return { ...action, type: String(action.type || '').trim(), path: safeSegment(action.path || action.file || '') };
}

export async function executeRealActions({ actions = [], projectId = 'general', approved = false, runId = 'brain-run', onProgress = async()=>{} } = {}) {
  const root = await activeRoot(projectId);
  const results = [];
  let completed = 0;
  for (const raw of actions) {
    const action = normalizeAction(raw);
    const startedAt = now();
    try {
      await onProgress({ stage: 'executing', current: action.title || action.type, percent: Math.floor((completed / Math.max(1, actions.length)) * 100) });
      const result = await executeOne({ action, root, approved, runId });
      completed++;
      results.push({ ok: true, action, result, startedAt, finishedAt: now() });
    } catch (error) {
      completed++;
      results.push({ ok: false, action, error: error.message, startedAt, finishedAt: now() });
    }
  }
  await onProgress({ stage: 'executed', current: 'Ações reais concluídas', percent: actions.length ? 100 : 0 });
  return { root, count: actions.length, ok: results.every(r => r.ok), results };
}

async function executeOne({ action, root, approved, runId }) {
  switch (action.type) {
    case 'list_workspace': return listWorkspace(root, action.path || '.');
    case 'read_file': return readFile(root, action.path);
    case 'write_file': return writeFile(root, action.path, action.content || '', { overwrite: action.overwrite !== false, runId });
    case 'append_file': return appendFile(root, action.path, action.content || '', runId);
    case 'patch_file': return patchFile(root, action.path, action.find, action.replace, runId);
    case 'copy_file': return copyFile(root, action.from, action.to, runId);
    case 'delete_file': return deleteFile(root, action.path, approved, runId);
    case 'restore_snapshot': return restoreSnapshot(root, action.runId || runId);
    case 'mkdir': return makeDir(root, action.path);
    case 'create_brain_report': return writeFile(root, `brain-runs/${runId}.md`, action.content || '# GitFusion Brain Run\n', { overwrite: true });
    case 'create_project_structure': return createProjectStructure(root, action);
    case 'run_command': return runCommand(root, action, approved);
    default: throw new Error(`Ação desconhecida: ${action.type || '(vazia)'}`);
  }
}

async function listWorkspace(root, rel='.') {
  const dir = path.join(root, safeSegment(rel) || '.'); assertInside(root, dir);
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return { path: path.relative(root, dir) || '.', entries: entries.slice(0, 200).map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' })) };
}
async function readFile(root, rel) {
  if (!rel) throw new Error('Arquivo não informado.');
  const file = path.join(root, rel); assertInside(root, file);
  const stat = await fs.stat(file);
  if (stat.size > MAX_TEXT_BYTES) throw new Error('Arquivo grande demais para leitura direta.');
  return { path: rel, content: await fs.readFile(file, 'utf8') };
}
async function writeFile(root, rel, content, { overwrite = true, runId = 'manual' } = {}) {
  if (!rel) throw new Error('Arquivo não informado.');
  if (!textSizeOk(content)) throw new Error('Conteúdo grande demais.');
  const file = path.join(root, rel); assertInside(root, file);
  if (!overwrite && await fs.pathExists(file)) throw new Error('Arquivo já existe e overwrite=false.');
  await fs.ensureDir(path.dirname(file));
  await backupFile(root, runId, rel).catch(() => null);
  await fs.writeFile(file, String(content), 'utf8');
  return { path: rel, bytes: Buffer.byteLength(String(content),'utf8'), written: true };
}
async function appendFile(root, rel, content, runId = 'manual') {
  if (!rel) throw new Error('Arquivo não informado.');
  if (!textSizeOk(content)) throw new Error('Conteúdo grande demais.');
  const file = path.join(root, rel); assertInside(root, file);
  await fs.ensureDir(path.dirname(file));
  await backupFile(root, runId, rel).catch(() => null);
  await fs.appendFile(file, String(content), 'utf8');
  return { path: rel, bytes: Buffer.byteLength(String(content),'utf8'), appended: true };
}

async function patchFile(root, rel, find, replace, runId = 'manual') {
  if (!rel) throw new Error('Arquivo não informado.');
  if (!find) throw new Error('Texto de busca não informado para patch_file.');
  const file = path.join(root, rel); assertInside(root, file);
  const stat = await fs.stat(file);
  if (stat.size > MAX_TEXT_BYTES) throw new Error('Arquivo grande demais para patch direto.');
  const before = await fs.readFile(file, 'utf8');
  if (!before.includes(find)) throw new Error('Texto de busca não encontrado no arquivo.');
  const after = before.replace(find, replace ?? '');
  await backupFile(root, runId, rel).catch(() => null);
  await fs.writeFile(file, after, 'utf8');
  return { path: rel, patched: true, beforeBytes: Buffer.byteLength(before, 'utf8'), afterBytes: Buffer.byteLength(after, 'utf8') };
}
async function copyFile(root, fromRel, toRel, runId = 'manual') {
  const from = safeSegment(fromRel); const to = safeSegment(toRel);
  if (!from || !to) throw new Error('Origem e destino são obrigatórios.');
  const source = path.join(root, from); const target = path.join(root, to);
  assertInside(root, source); assertInside(root, target);
  await fs.ensureDir(path.dirname(target));
  await backupFile(root, runId, to).catch(() => null);
  await fs.copy(source, target, { overwrite: true });
  return { from, to, copied: true };
}
async function deleteFile(root, rel, approved, runId = 'manual') {
  if (!approved) throw new Error('delete_file exige aprovação explícita.');
  const safe = safeSegment(rel);
  if (!safe) throw new Error('Arquivo não informado.');
  const file = path.join(root, safe); assertInside(root, file);
  await backupFile(root, runId, safe).catch(() => null);
  await fs.remove(file);
  return { path: safe, deleted: true };
}

async function makeDir(root, rel) {
  const dir = path.join(root, rel || '.'); assertInside(root, dir); await fs.ensureDir(dir); return { path: rel || '.', created: true };
}
async function createProjectStructure(root, action) {
  const base = safeSegment(action.path || action.name || 'gitfusion-generated-project');
  const projectRoot = path.join(root, base); assertInside(root, projectRoot);
  await fs.ensureDir(projectRoot);
  const files = Array.isArray(action.files) ? action.files : [];
  for (const f of files) await writeFile(projectRoot, safeSegment(f.path), f.content || '', { overwrite: true });
  if (!files.some(f => f.path === 'README.md')) await writeFile(projectRoot, 'README.md', `# ${base}\n\nProjeto criado pelo GitFusion Brain.\n`, { overwrite: true });
  return { path: base, files: Math.max(files.length, 1), created: true };
}
function commandAllowed(command='') {
  const cmd = String(command).trim();
  if (!cmd) return { ok:false, reason:'Comando vazio.' };
  if (BLOCKED_PATTERNS.some(r => r.test(cmd))) return { ok:false, reason:'Comando perigoso bloqueado.' };
  const bin = cmd.split(/\s+/)[0];
  if (!ALLOWED_COMMANDS.has(bin)) return { ok:false, reason:`Comando não permitido no modo mobile seguro: ${bin}` };
  return { ok:true };
}
async function runCommand(root, action, approved) {
  const command = String(action.command || '').trim();
  const allowed = commandAllowed(command);
  if (!allowed.ok) throw new Error(allowed.reason);
  if (!approved && !['pwd','ls','cat','node'].includes(command.split(/\s+/)[0])) throw new Error('Comando exige aprovação explícita.');
  return new Promise((resolve, reject) => {
    const child = spawn(command, { cwd: root, shell: true, timeout: COMMAND_TIMEOUT_MS });
    let stdout='', stderr='';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('error', reject);
    child.on('close', code => resolve({ command, code, stdout: stdout.slice(-6000), stderr: stderr.slice(-6000) }));
  });
}
