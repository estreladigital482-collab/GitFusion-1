const sessions = new Map();

export function rememberWorking(chatId = 'main', item = {}) {
  const list = sessions.get(chatId) || [];
  list.unshift({ ...item, at: new Date().toISOString() });
  sessions.set(chatId, list.slice(0, 20));
  return sessions.get(chatId);
}

export function readWorking(chatId = 'main') {
  return sessions.get(chatId) || [];
}
