import { config } from '../config.js';

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function aiStatus() {
  if (config.ai.provider === 'ollama' || config.ai.baseUrl.includes('11434')) {
    try {
      const res = await fetchWithTimeout(`${config.ai.baseUrl}/api/tags`, {}, 2500);
      return { online: res.ok, provider: 'ollama', model: config.ai.model };
    } catch {
      return { online: false, provider: 'ollama', model: config.ai.model };
    }
  }
  return { online: false, provider: config.ai.provider || 'local-fallback', model: config.ai.model };
}

export async function askAI(messages = [], context = {}) {
  const status = await aiStatus();
  if (status.online && status.provider === 'ollama') {
    try {
      const res = await fetchWithTimeout(`${config.ai.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.ai.model, messages, stream: false })
      }, 12000);
      if (res.ok) {
        const data = await res.json();
        return { provider: 'ollama', content: data.message?.content || '' };
      }
    } catch {}
  }

  const last = messages.at(-1)?.content || '';
  return {
    provider: 'gitfusion-local-fallback',
    content: `Plano local gerado sem LLM externo. Entrada entendida: ${last.slice(0, 400)}\n\nPróximos passos sugeridos:\n1. Validar links dos repositórios.\n2. Baixar e mapear arquivos.\n3. Detectar tecnologias.\n4. Criar tasks para aprovação.\n5. Executar fusão com logs e exportar ZIP.`,
  };
}
