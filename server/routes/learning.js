import { Router } from 'express';
import { addLearningSource, explainLearningFile, getLearningTree, listLearningSources, readLearningFile, removeLearningSource } from '../services/learning.js';

export const learningRouter = Router();
learningRouter.get('/sources', async (req, res) => res.json(await listLearningSources()));
learningRouter.post('/sources', async (req, res) => res.json(await addLearningSource(req.body || {})));
learningRouter.delete('/sources/:id', async (req, res) => res.json(await removeLearningSource(req.params.id)));
learningRouter.get('/:id/tree', async (req, res) => res.json(await getLearningTree(req.params.id)));
learningRouter.get('/:id/file', async (req, res) => res.json(await readLearningFile(req.params.id, req.query.path || '')));
learningRouter.post('/:id/explain', async (req, res) => res.json(await explainLearningFile(req.params.id, req.body?.path || '')));
