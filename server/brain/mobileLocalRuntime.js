import fs from 'fs/promises';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getRuntimeConfig, listLocalModelProfiles, pickModelForTask } from './modelLibrary.js';
import { listOllamaModels, generateWithLocalModel } from './localModelRuntime.js';

const execFileAsync = promisify(execFile);
const TERMUX_HOME_HINT = '/data/data/com.termux/files/home';

async function commandExists(command) {
  try {
    await execFileAsync('sh', ['-lc', `command -v ${command}`], { timeout: 2500 });
    return true;
  } catch {
    return false;
  }
}

async function safeExec(command, args = [], timeout = 3500) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout, maxBuffer: 1024 * 256 });
    return { ok: true, stdout: String(stdout || '').trim(), stderr: String(stderr || '').trim() };
  } catch (error) {
    return { ok: false, error: error.message, stdout: String(error.stdout || '').trim(), stderr: String(error.stderr || '').trim() };
  }
}

function memoryTier(totalMem) {
  const gb = totalMem / 1024 / 1024 / 1024;
  if (gb < 4) return 'tiny';
  if (gb < 6) return 'small';
  if (gb < 10) return 'medium';
  return 'large';
}

function modelFit(profile, tier) {
  const map = { tiny: 0, small: 1, medium: 2, large: 3 };
  const needs = { tiny: 0, low: 0, small: 1, medium: 2, high: 3, large: 3 };
  return (needs[profile.deviceTier] ?? 1) <= (map[tier] ?? 1);
}

export async function getMobileRuntimeStatus() {
  const [ollamaBin, llamaBin, termuxSetupStorage, gitBin, nodeBin] = await Promise.all([
    commandExists('ollama'),
    commandExists('llama-cli'),
    commandExists('termux-setup-storage'),
    commandExists('git'),
    commandExists('node')
  ]);
  const runtime = await getRuntimeConfig('ollama');
  const models = await listOllamaModels();
  const profiles = await listLocalModelProfiles();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const tier = memoryTier(totalMem);
  const installedNames = models.map(m => m.name || m.model || m).filter(Boolean);
  const recommended = profiles
    .filter(p => modelFit(p, tier))
    .map(p => ({ ...p, installed: p.candidates.some(name => installedNames.includes(name)), recommendedForThisPhone: true }))
    .slice(0, 8);
  const installedProfiles = profiles
    .map(p => ({ ...p, installed: p.candidates.some(name => installedNames.includes(name)) }))
    .filter(p => p.installed);

  let ollamaApi = { ok: false, baseUrl: runtime?.baseUrl || 'http://127.0.0.1:11434' };
  try {
    const res = await fetch(`${ollamaApi.baseUrl}/api/tags`, { signal: AbortSignal.timeout(1800) });
    ollamaApi = { ...ollamaApi, ok: res.ok, status: res.status };
  } catch (error) {
    ollamaApi = { ...ollamaApi, ok: false, error: error.message };
  }

  return {
    ok: true,
    platform: {
      os: os.platform(),
      arch: os.arch(),
      isTermux: process.cwd().startsWith(TERMUX_HOME_HINT) || process.env.PREFIX?.includes('com.termux') || Boolean(process.env.TERMUX_VERSION),
      cwd: process.cwd(),
      node: process.version,
      cpus: os.cpus()?.length || 1,
      totalMemoryMB: Math.round(totalMem / 1024 / 1024),
      freeMemoryMB: Math.round(freeMem / 1024 / 1024),
      tier
    },
    binaries: { node: nodeBin, git: gitBin, ollama: ollamaBin, llamaCli: llamaBin, termuxSetupStorage },
    ollama: { binary: ollamaBin, api: ollamaApi, models: installedNames, rawModels: models },
    installedProfiles,
    recommended,
    ready: Boolean(ollamaApi.ok && installedNames.length),
    mode: ollamaApi.ok && installedNames.length ? 'local-model-ready' : 'offline-symbolic-rag-safe'
  };
}

export async function chooseMobileModel(taskText = '') {
  const status = await getMobileRuntimeStatus();
  const selected = await pickModelForTask(taskText, status.ollama.rawModels || []);
  return { ok: true, status: { mode: status.mode, ready: status.ready, tier: status.platform.tier, models: status.ollama.models }, selected };
}

export async function runMobileLocalPrompt({ prompt = '', taskText = '', context = '' } = {}) {
  const status = await getMobileRuntimeStatus();
  const result = await generateWithLocalModel({ prompt, taskText: taskText || prompt, context });
  return { ok: true, status: { mode: status.mode, ready: status.ready, tier: status.platform.tier }, result };
}

export async function getTermuxModelSetupPlan() {
  const status = await getMobileRuntimeStatus();
  const tinyFirst = status.recommended[0]?.candidates?.[0] || 'qwen2.5-coder:0.5b';
  return {
    ok: true,
    status,
    warning: 'Instalação de modelo no celular depende de RAM, espaço e compatibilidade. O GitFusion não baixa nada sem você executar os comandos.',
    commands: [
      'pkg update && pkg upgrade',
      'pkg install git nodejs-lts',
      '# Instale Ollama no Android/Termux se disponível para seu aparelho, ou use um servidor Ollama na rede local.',
      'export OLLAMA_HOST=127.0.0.1:11434',
      `ollama pull ${tinyFirst}`,
      'npm run brain:local-status'
    ],
    fallback: [
      'Se Ollama não rodar no celular, use o modo offline-symbolic-rag-safe.',
      'Outra opção gratuita: rodar Ollama em um PC na mesma rede e apontar GITFUSION_OLLAMA_BASE_URL para ele.'
    ]
  };
}

export async function probeLocalCommands() {
  const commands = ['node', 'npm', 'git', 'ollama', 'llama-cli'];
  const results = [];
  for (const cmd of commands) {
    const exists = await commandExists(cmd);
    const version = exists ? await safeExec(cmd, ['--version'], 2500) : null;
    results.push({ command: cmd, exists, version: version?.stdout || version?.stderr || version?.error || '' });
  }
  return { ok: true, results };
}
