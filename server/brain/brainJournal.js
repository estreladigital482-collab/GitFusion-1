import { thoughtsFile, readBrainJson, writeBrainJson, id, now } from './utils.js';

export async function logBrainEvent({ type='thought', title='Evento cerebral', content='', signalId='', projectId='', workspaceId='default', metadata={} } = {}) {
  const events = await readBrainJson(thoughtsFile, []);
  const event = { id: id('event'), type, title, content, signalId, projectId, workspaceId, metadata, createdAt: now() };
  events.unshift(event);
  await writeBrainJson(thoughtsFile, events.slice(0, 5000));
  return event;
}

export async function listBrainEvents({ limit=80, projectId='', workspaceId='' } = {}) {
  const events = await readBrainJson(thoughtsFile, []);
  return events
    .filter(e => (!projectId || e.projectId === projectId) && (!workspaceId || e.workspaceId === workspaceId))
    .slice(0, Number(limit) || 80);
}
