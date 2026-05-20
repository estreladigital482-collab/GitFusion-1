import { getRuntimeConfig, pickModelForTask } from './modelLibrary.js';

async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function listOllamaModels() {
  const runtime = await getRuntimeConfig('ollama');
  if (!runtime?.enabled) return [];
  try {
    const res = await fetchWithTimeout(`${runtime.baseUrl}${runtime.healthPath}`, {}, 1800);
    if (!res.ok) return [];
    const data = await res.json();
    return data.models || [];
  } catch {
    return [];
  }
}

export async function resolveLocalModel(taskText = '') {
  const installed = await listOllamaModels();
  return pickModelForTask(taskText, installed);
}

export async function generateWithLocalModel({ prompt, taskText = '', context = '' }) {
  const runtime = await getRuntimeConfig('ollama');
  const selected = await resolveLocalModel(taskText || prompt);

  if (selected.provider !== 'ollama') {
    return {
      provider: 'internal',
      model: selected.selectedName,
      text: offlineSymbolicResponse({ prompt, context, selected })
    };
  }

  try {
    const res = await fetchWithTimeout(`${runtime.baseUrl}${runtime.generatePath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selected.selectedName,
        prompt: buildPrompt({ prompt, context }),
        stream: false
      })
    }, 45000);

    if (!res.ok) throw new Error(`Ollama respondeu ${res.status}`);
    const data = await res.json();
    return {
      provider: 'ollama',
      model: selected.selectedName,
      text: data.response || ''
    };
  } catch (error) {
    return {
      provider: 'internal',
      model: 'offline-symbolic',
      text: offlineSymbolicResponse({ prompt, context, selected, error: error.message })
    };
  }
}

function buildPrompt({ prompt, context }) {
  return `Você é a IA local do GitFusion. Trabalhe como engenheiro de software, professor e executor supervisionado.\n\nContexto recuperado:\n${context || 'Sem contexto recuperado.'}\n\nPedido do usuário:\n${prompt}\n\nResponda com plano curto, próximos passos e riscos.`;
}

function offlineSymbolicResponse({ prompt, context, selected, error }) {
  const lines = [
    'Estou em modo local simbólico do GitFusion.',
    `Roteamento escolhido: ${selected?.role || 'planner'}.`,
    context ? 'Usei memória/RAG local para entender o pedido.' : 'Não encontrei contexto local suficiente ainda.',
    error ? `Fallback ativado: ${error}.` : '',
    'Próximo passo sugerido: gerar tasks autorizáveis antes de executar qualquer comando.',
    `Pedido analisado: ${String(prompt).slice(0, 280)}`
  ].filter(Boolean);
  return lines.join('\n');
}
