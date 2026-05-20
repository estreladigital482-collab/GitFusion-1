export function receiveSignal(input = {}) {
  const prompt = String(input.prompt || input.message || '').trim();
  const repos = Array.isArray(input.repos) ? input.repos : [];
  const attachments = Array.isArray(input.attachments) ? input.attachments : [];
  const now = new Date().toISOString();
  return {
    id: `signal_${Date.now()}`,
    prompt,
    repos,
    attachments,
    workspaceId: input.workspaceId || 'mobile',
    projectId: input.projectId || input.activeProjectId || 'general',
    chatId: input.chatId || 'main',
    source: input.source || 'chat',
    createdAt: now,
    raw: input
  };
}
