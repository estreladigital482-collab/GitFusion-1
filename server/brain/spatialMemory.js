import fs from 'fs-extra';
import path from 'path';
import { brainDir, id, now } from './utils.js';

const palaceFile = path.join(brainDir, 'memory-palace.json');

async function readPalace() {
  await fs.ensureDir(brainDir);
  if (!(await fs.pathExists(palaceFile))) {
    await fs.writeJson(palaceFile, { rooms: [], objects: [] }, { spaces: 2 });
  }
  return fs.readJson(palaceFile);
}

async function writePalace(palace) {
  await fs.writeJson(palaceFile, palace, { spaces: 2 });
  return palace;
}

export async function ensureRoom({ name='GitFusion', type='project', projectId='', workspaceId='default' } = {}) {
  const palace = await readPalace();
  let room = palace.rooms.find(r => r.name === name && r.projectId === projectId && r.workspaceId === workspaceId);
  if (!room) {
    room = { id: id('room'), name, type, projectId, workspaceId, createdAt: now(), updatedAt: now() };
    palace.rooms.unshift(room);
    await writePalace(palace);
  }
  return room;
}

export async function placeMemoryObject({ roomName='GitFusion', objectType='note', title='Objeto de memória', content='', neuronId='', projectId='', workspaceId='default', tags=[] } = {}) {
  const palace = await readPalace();
  let room = palace.rooms.find(r => r.name === roomName && r.projectId === projectId && r.workspaceId === workspaceId);
  if (!room) {
    room = { id: id('room'), name: roomName, type: 'project', projectId, workspaceId, createdAt: now(), updatedAt: now() };
    palace.rooms.unshift(room);
  }
  const object = { id: id('object'), roomId: room.id, objectType, title, content, neuronId, projectId, workspaceId, tags, createdAt: now(), updatedAt: now() };
  palace.objects.unshift(object);
  await writePalace(palace);
  return { room, object };
}

export async function listPalace({ projectId='', workspaceId='' } = {}) {
  const palace = await readPalace();
  return {
    rooms: palace.rooms.filter(r => (!projectId || r.projectId === projectId) && (!workspaceId || r.workspaceId === workspaceId)),
    objects: palace.objects.filter(o => (!projectId || o.projectId === projectId) && (!workspaceId || o.workspaceId === workspaceId)),
  };
}
