import { Router } from 'express';
import { createTask, listTasks, updateTask } from '../services/tasks.js';

export const tasksRouter = Router();

tasksRouter.get('/:projectId', async (req, res) => res.json({ tasks: await listTasks(req.params.projectId) }));
tasksRouter.post('/:projectId', async (req, res) => res.json({ task: await createTask(req.params.projectId, req.body) }));
tasksRouter.patch('/:projectId/:taskId', async (req, res) => res.json({ task: await updateTask(req.params.projectId, req.params.taskId, req.body) }));
