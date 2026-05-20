import { nanoid } from 'nanoid';
import { readJson, writeJson } from './store.js';

export async function listTasks(projectId) {
  const db = await readJson('tasks', projectId, { tasks: [] });
  return db.tasks || [];
}

export async function createTask(projectId, input) {
  const db = await readJson('tasks', projectId, { tasks: [] });
  const task = {
    id: nanoid(10),
    projectId,
    title: input.title || 'Nova tarefa',
    description: input.description || '',
    status: input.status || 'pending_approval',
    progress: Number(input.progress || 0),
    estimateMinutes: Number(input.estimateMinutes || 0),
    createdAt: new Date().toISOString(),
  };
  db.tasks.push(task);
  await writeJson('tasks', projectId, db);
  return task;
}

export async function updateTask(projectId, taskId, patch = {}) {
  const db = await readJson('tasks', projectId, { tasks: [] });
  db.tasks = db.tasks.map(t => t.id === taskId ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t);
  await writeJson('tasks', projectId, db);
  return db.tasks.find(t => t.id === taskId);
}
