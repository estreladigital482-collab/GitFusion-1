import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ROOT = process.cwd();
const PALACE_DIR = path.join(ROOT, 'data', 'brain', 'mempalace');

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }
function slug(input) { return String(input || 'default').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default'; }
function id(prefix = 'mem') { return `${prefix}_${crypto.randomBytes(6).toString('hex')}`; }

export async function createRoom({ workspaceId = 'default', projectId = 'general', name = 'Projeto' }) {
  await ensureDir(PALACE_DIR);
  const roomId = slug(`${workspaceId}-${projectId}`);
  const roomPath = path.join(PALACE_DIR, `${roomId}.json`);
  let room = await readRoom(roomId).catch(() => null);
  if (!room) {
    room = {
      id: roomId,
      workspaceId,
      projectId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      objects: [],
      links: []
    };
    await fs.writeFile(roomPath, JSON.stringify(room, null, 2));
  }
  return room;
}

export async function readRoom(roomId) {
  const raw = await fs.readFile(path.join(PALACE_DIR, `${roomId}.json`), 'utf8');
  return JSON.parse(raw);
}

export async function listRooms() {
  await ensureDir(PALACE_DIR);
  const files = await fs.readdir(PALACE_DIR);
  const rooms = [];
  for (const file of files.filter(f => f.endsWith('.json'))) {
    try { rooms.push(JSON.parse(await fs.readFile(path.join(PALACE_DIR, file), 'utf8'))); } catch {}
  }
  return rooms.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function addMemoryObject({ roomId, type = 'note', title, content, tags = [], strength = 1 }) {
  await ensureDir(PALACE_DIR);
  let room = await readRoom(roomId);
  const object = {
    id: id('obj'),
    type,
    title: title || type,
    content: content || '',
    tags,
    strength,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  room.objects.push(object);
  room.updatedAt = new Date().toISOString();
  await fs.writeFile(path.join(PALACE_DIR, `${roomId}.json`), JSON.stringify(room, null, 2));
  return object;
}

export async function searchPalace(query = '') {
  const q = String(query).toLowerCase();
  const rooms = await listRooms();
  const hits = [];
  for (const room of rooms) {
    for (const object of room.objects || []) {
      const hay = `${object.title} ${object.content} ${(object.tags || []).join(' ')}`.toLowerCase();
      if (!q || hay.includes(q)) {
        hits.push({ roomId: room.id, roomName: room.name, ...object });
      }
    }
  }
  return hits.sort((a, b) => (b.strength || 0) - (a.strength || 0)).slice(0, 30);
}

export async function reinforceMemory({ roomId, objectId, reward = 1 }) {
  const room = await readRoom(roomId);
  const object = room.objects.find(o => o.id === objectId);
  if (!object) return null;
  object.strength = Math.max(0, (object.strength || 1) + reward);
  object.updatedAt = new Date().toISOString();
  room.updatedAt = object.updatedAt;
  await fs.writeFile(path.join(PALACE_DIR, `${roomId}.json`), JSON.stringify(room, null, 2));
  return object;
}
