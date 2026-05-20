export function safetyGate({ perception, signal }) {
  const text = String(signal.prompt || '').toLowerCase();
  const warnings = [];
  if (perception.risk === 'high') warnings.push('Pedido contém ação sensível. Execução automática bloqueada até autorização explícita.');
  if (/token|senha|secret|private key/.test(text)) warnings.push('Não exponha tokens ou senhas no chat. Use .env/local storage quando possível.');
  if (/apagar tudo|rm -rf|format/.test(text)) warnings.push('Comandos destrutivos exigem confirmação manual.');
  return {
    allowedToPlan: true,
    allowedToExecute: warnings.length === 0 && String(process.env.GITFUSION_BRAIN_AUTORUN || 'false') === 'true',
    mode: warnings.length ? 'supervised' : 'planned',
    warnings
  };
}
