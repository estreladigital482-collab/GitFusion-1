import { aiStatus } from '../services/ai.js';

export async function chooseModel({ task='general', mode='auto' } = {}) {
  const status = await aiStatus().catch(()=>({ effectiveProvider:'fallback-offline' }));
  const preference = task.includes('code') || task.includes('merge') ? 'coder' : 'general';
  return {
    preference,
    provider: status.effectiveProvider || 'fallback-offline',
    localAvailable: Boolean(status.local?.available),
    onlineAvailable: Boolean(status.online?.available),
    reason: status.effectiveProvider === 'ollama' ? 'Modelo local disponível.' : status.effectiveProvider === 'openai-compatible' ? 'Modelo online configurado.' : 'Usando fallback offline com memória/RAG.'
  };
}
