import { Router } from 'express';
import {
  getWiki,
  updateWiki,
  listWikiPages,
  getWikiPage,
  saveWikiPage,
  deleteWikiPage,
  generateProjectWiki,
  searchWiki,
} from '../services/wiki.js';

export const wikiRouter = Router();

wikiRouter.get('/:projectId', async (req, res) => res.json({ wiki: await getWiki(req.params.projectId) }));
wikiRouter.put('/:projectId', async (req, res) => res.json({ wiki: await updateWiki(req.params.projectId, req.body) }));

wikiRouter.post('/:projectId/generate', async (req, res) => res.json({ wiki: await generateProjectWiki(req.params.projectId) }));
wikiRouter.get('/:projectId/pages', async (req, res) => res.json({ pages: await listWikiPages(req.params.projectId) }));
wikiRouter.post('/:projectId/pages', async (req, res) => {
  const { slug, title, content } = req.body || {};
  res.json({ page: await saveWikiPage(req.params.projectId, slug || title, content, title) });
});
wikiRouter.get('/:projectId/pages/:slug', async (req, res) => res.json({ page: await getWikiPage(req.params.projectId, req.params.slug) }));
wikiRouter.put('/:projectId/pages/:slug', async (req, res) => {
  const { title, content } = req.body || {};
  res.json({ page: await saveWikiPage(req.params.projectId, req.params.slug, content, title) });
});
wikiRouter.delete('/:projectId/pages/:slug', async (req, res) => res.json(await deleteWikiPage(req.params.projectId, req.params.slug)));
wikiRouter.get('/:projectId/search', async (req, res) => res.json({ results: await searchWiki(req.params.projectId, req.query.q || '') }));
