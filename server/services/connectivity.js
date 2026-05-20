import { readJson, writeJson } from './store.js';
import { aiStatus } from './ai.js';

const VALID_MODES = new Set(['auto', 'online', 'offline']);

async function fetchWithTimeout(url, options = {}, timeoutMs = 1800) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getNetworkMode() {
  const settings = await readJson('settings', 'connectivity', { mode: 'auto', updatedAt: null });
  const mode = VALID_MODES.has(settings.mode) ? settings.mode : 'auto';
  return { ...settings, mode };
}

export async function setNetworkMode(mode = 'auto') {
  if (!VALID_MODES.has(mode)) throw new Error('Modo inválido. Use auto, online ou offline.');
  return writeJson('settings', 'connectivity', { mode, updatedAt: new Date().toISOString() });
}

export async function detectInternet() {
  try {
    const res = await fetchWithTimeout('https://api.github.com/rate_limit', {
      headers: { 'User-Agent': 'GitFusion/0.1.22' }
    }, 1800);
    return { available: res.ok, checkedAt: new Date().toISOString(), source: 'github' };
  } catch {
    return { available: false, checkedAt: new Date().toISOString(), source: 'github' };
  }
}

export async function connectivityStatus() {
  const setting = await getNetworkMode();
  const internet = setting.mode === 'offline'
    ? { available: false, skipped: true, checkedAt: new Date().toISOString(), source: 'disabled-by-offline-mode' }
    : await detectInternet();

  const ai = await aiStatus({ skipRemote: setting.mode === 'offline' });
  let effectiveMode = setting.mode;
  if (setting.mode === 'auto') effectiveMode = internet.available ? 'online' : 'offline';

  return {
    mode: setting.mode,
    effectiveMode,
    internet,
    github: { available: internet.available && effectiveMode !== 'offline' },
    ai,
    offlineReady: true,
    onlineReady: internet.available,
    updatedAt: new Date().toISOString()
  };
}

export async function shouldUseNetwork() {
  const { mode } = await getNetworkMode();
  if (mode === 'offline') return false;
  if (mode === 'online') return true;
  const internet = await detectInternet();
  return internet.available;
}
