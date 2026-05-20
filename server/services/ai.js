import { config } from '../config.js';
import { ragContext } from './rag.js';
import { getNetworkMode } from './connectivity.js';
import { readJson, writeJson } from './store.js';

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

function normalizeProvider(p='auto') {
  const v = String(p || 'auto').toLowerCase();
  if (['auto','offline','ollama','local','openai-compatible','online'].includes(v)) return v;
  return 'auto';
}

export async function getAISettings() {
  const saved = await readJson('settings', 'ai', {});
  return {
    provider: normalizeProvider(saved.provider || config.ai.provider || 'auto'),
    localUrl: saved.localUrl || config.ai.localUrl,
    localModel: saved.localModel || config.ai.localModel,
    onlineBaseUrl: saved.onlineBaseUrl || config.ai.onlineBaseUrl,
    onlineModel: saved.onlineModel || config.ai.onlineModel || 'gpt-4o-mini',
    hasOnlineToken: Boolean(saved.token || config.ai.token),
    token: saved.token || config.ai.token || '',
    updatedAt: saved.updatedAt || null,
  };
}

export async function saveAISettings(input = {}) {
  const current = await getAISettings();
  const next = {
    provider: normalizeProvider(input.provider || current.provider),
    localUrl: input.localUrl ?? current.localUrl,
    localModel: input.localModel ?? current.localModel,
    onlineBaseUrl: input.onlineBaseUrl ?? current.onlineBaseUrl,
    onlineModel: input.onlineModel ?? current.onlineModel,
    token: input.token ?? current.token,
    updatedAt: new Date().toISOString(),
  };
  await writeJson('settings', 'ai', next);
  return { ...next, token: next.token ? 'saved' : '' };
}

async function ollamaStatus(settings) {
  try {
    const res = await fetchWithTimeout(`${settings.localUrl}/api/tags`, {}, 1800);
    if (!res.ok) return { available: false, provider: 'ollama', model: settings.localModel };
    const data = await res.json().catch(()=>({ models: [] }));
    const models = (data.models || []).map(m => m.name).filter(Boolean);
    return { available: true, provider: 'ollama', model: settings.localModel, installedModels: models };
  } catch {
    return { available: false, provider: 'ollama', model: settings.localModel };
  }
}

async function onlineStatus(settings, networkMode = 'auto') {
  if (networkMode === 'offline') return { available: false, provider: 'online', skipped: true, reason: 'offline-mode' };
  if (!settings.onlineBaseUrl || !settings.token) return { available: false, provider: 'online', reason: 'missing-config' };
  return { available: true, provider: 'openai-compatible', model: settings.onlineModel, baseUrl: settings.onlineBaseUrl.replace(/\/v1\/?$/, '') };
}

export async function aiStatus(options = {}) {
  const settings = await getAISettings();
  const network = await getNetworkMode().catch(()=>({ mode: 'auto' }));
  const mode = options.skipRemote ? 'offline' : network.mode;
  const local = await ollamaStatus(settings);
  const online = await onlineStatus(settings, mode);

  let effectiveProvider = 'fallback-offline';
  if (settings.provider === 'offline' || mode === 'offline') effectiveProvider = local.available ? 'ollama' : 'fallback-offline';
  else if (settings.provider === 'ollama' || settings.provider === 'local') effectiveProvider = local.available ? 'ollama' : 'fallback-offline';
  else if (settings.provider === 'openai-compatible' || settings.provider === 'online') effectiveProvider = online.available ? 'openai-compatible' : (local.available ? 'ollama' : 'fallback-offline');
  else effectiveProvider = local.available ? 'ollama' : (online.available ? 'openai-compatible' : 'fallback-offline');

  return {
    mode: settings.provider,
    networkMode: mode,
    effectiveProvider,
    local,
    online,
    ready: effectiveProvider !== 'fallback-offline',
    fallbackReady: true,
    updatedAt: new Date().toISOString(),
  };
}

async function callOllama(settings, messages, localContext='') {
  const payloadMessages = localContext
    ? [{ role:'system', content:'Use o contexto local do GitFusion quando for relevante:\n'+localContext }, ...messages]
    : messages;
  const res = await fetchWithTimeout(`${settings.localUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: settings.localModel, messages: payloadMessages, stream: false })
  }, 45000);
  if (!res.ok) throw new Error(`Ollama respondeu HTTP ${res.status}`);
  const data = await res.json();
  return data.message?.content || '';
}

async function callOpenAICompatible(settings, messages, localContext='') {
  const base = settings.onlineBaseUrl.replace(/\/$/, '').replace(/\/v1$/, '');
  const payloadMessages = localContext
    ? [{ role:'system', content:'Use este contexto local/RAG do GitFusion quando for relevante:\n'+localContext }, ...messages]
    : messages;
  const res = await fetchWithTimeout(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.token}`,
    },
    body: JSON.stringify({ model: settings.onlineModel, messages: payloadMessages, temperature: 0.2 })
  }, 45000);
  if (!res.ok) throw new Error(`API online respondeu HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function localFallbackAnswer(lastInput, localContext='') {
  const short = String(lastInput || '').slice(0, 500);
  return `${localContext ? 'Contexto local encontrado:\n' + localContext.slice(0, 1200) + '\n\n' : ''}Modo offline ativo. Eu ainda consigo trabalhar com arquivos, memória, wiki, RAG local e tarefas.\n\nEntendi sua solicitação:\n${short}\n\nPlano de ação sugerido:\n1. Identificar os repositórios envolvidos.\n2. Consultar a busca local/RAG e a Wiki.\n3. Criar uma lista de tarefas aprováveis.\n4. Executar apenas ações permitidas.\n5. Atualizar Wiki, Memória e Projeto mesclado.\n\nPara respostas mais inteligentes, instale um modelo local via Ollama no Termux ou configure uma API compatível.`;
}

export async function askAI(messages = [], context = {}) {
  const settings = await getAISettings();
  const status = await aiStatus();
  const lastInput = messages.at(-1)?.content || context.prompt || '';
  let localContext = '';
  if (lastInput) {
    try {
      const rag = await ragContext(lastInput, { projectId: context.projectId || '', limit: 7 });
      localContext = rag.context || '';
    } catch {}
  }

  try {
    if (status.effectiveProvider === 'ollama') {
      return { provider: 'ollama', model: settings.localModel, content: await callOllama(settings, messages, localContext), usedRag: Boolean(localContext) };
    }
    if (status.effectiveProvider === 'openai-compatible') {
      return { provider: 'openai-compatible', model: settings.onlineModel, content: await callOpenAICompatible(settings, messages, localContext), usedRag: Boolean(localContext) };
    }
  } catch (error) {
    return { provider: 'gitfusion-local-fallback', error: error.message, content: localFallbackAnswer(lastInput, localContext), usedRag: Boolean(localContext) };
  }

  return { provider: 'gitfusion-local-fallback', content: localFallbackAnswer(lastInput, localContext), usedRag: Boolean(localContext) };
}
