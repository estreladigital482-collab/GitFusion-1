import { Router } from 'express';
import { createExecution, listExecutions, getExecution, approveExecution, startExecution, pauseExecution, cancelExecution, appendExecutionLog } from '../services/executor.js';

export const executorRouter = Router();

executorRouter.get('/:projectId', async (req, res) => res.json({ executions: await listExecutions(req.params.projectId) }));
executorRouter.post('/:projectId', async (req, res) => res.json({ execution: await createExecution(req.params.projectId, req.body || {}) }));
executorRouter.get('/:projectId/:executionId', async (req, res) => {
  const execution = await getExecution(req.params.projectId, req.params.executionId);
  if (!execution) return res.status(404).json({ error: 'Execução não encontrada.' });
  res.json({ execution });
});
executorRouter.post('/:projectId/:executionId/approve', async (req, res) => res.json({ execution: await approveExecution(req.params.projectId, req.params.executionId, req.body?.stepIds || []) }));
executorRouter.post('/:projectId/:executionId/start', async (req, res) => res.json({ execution: await startExecution(req.params.projectId, req.params.executionId) }));
executorRouter.post('/:projectId/:executionId/pause', async (req, res) => res.json({ execution: await pauseExecution(req.params.projectId, req.params.executionId) }));
executorRouter.post('/:projectId/:executionId/cancel', async (req, res) => res.json({ execution: await cancelExecution(req.params.projectId, req.params.executionId) }));
executorRouter.post('/:projectId/:executionId/log', async (req, res) => res.json({ execution: await appendExecutionLog(req.params.projectId, req.params.executionId, req.body || {}) }));
