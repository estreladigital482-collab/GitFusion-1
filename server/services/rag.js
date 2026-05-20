import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';
import { readJson, writeJson } from './store.js';

const TEXT_EXT = new Set(['.js','.jsx','.ts','.tsx','.json','.md','.txt','.css','.html','.yml','.yaml','.env','.sh','.py','.java','.kt','.swift','.go','.rs','.php','.rb','.sql','.xml','.toml','.ini','.gradle']);
const SKIP_DIRS = new Set(['node_modules','.git','dist','build','.next','.nuxt','coverage','.cache','.gradle','android/app/build']);
const MAX_FILE_BYTES = 220_000;
const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 220;

function now(){ return new Date().toISOString(); }
function sha(input){ return crypto.createHash('sha1').update(String(input)).digest('hex'); }
function normalize(text=''){
  return String(text)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase();
}
function tokenize(text=''){
  return normalize(text).match(/[a-z0-9_.$#/@-]{2,}/g)?.filter(t=>!STOP.has(t)) || [];
}
const STOP = new Set('a o os as um uma de da do das dos e em para por com sem sobre que no na nos nas is are the and or to of in on for from with function const let var return import export default class async await true false null undefined'.split(' '));

async function safeRead(file){
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return '';
    return await fs.readFile(file, 'utf8');
  } catch { return ''; }
}

async function walkFiles(root, sourceType, base=root, out=[]){
  if (!await fs.pathExists(root)) return out;
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(()=>[]);
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walkFiles(full, sourceType, base, out);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXT.has(ext)) continue;
      out.push({ file: full, rel: path.relative(base, full), sourceType });
    }
  }
  return out;
}

function chunkText(text, meta){
  const clean = String(text || '').replace(/\r/g,'').trim();
  if (!clean) return [];
  const chunks=[];
  let i=0, idx=0;
  while (i < clean.length) {
    const part = clean.slice(i, i + CHUNK_SIZE);
    const tokens = tokenize(part);
    if (tokens.length) {
      chunks.push({
        id: sha(`${meta.sourceType}:${meta.path}:${idx}:${part.slice(0,80)}`),
        sourceType: meta.sourceType,
        projectId: meta.projectId || '',
        title: meta.title || path.basename(meta.path || 'documento'),
        path: meta.path || '',
        chunkIndex: idx,
        text: part,
        tokens,
        tokenCount: tokens.length,
        updatedAt: meta.updatedAt || now()
      });
    }
    idx++;
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function projectSources(){
  const sources=[];
  const projects = await readJson('projects', 'index', { projects: [] });
  for (const p of projects.projects || []) {
    const jobId = p.jobId || p.id;
    const dirs = [
      path.join(config.workspaceDir, jobId, 'output'),
      path.join(config.workspaceDir, jobId),
    ];
    for (const dir of dirs) {
      if (await fs.pathExists(dir)) {
        sources.push({ projectId: jobId, root: dir, sourceType: 'project' });
        break;
      }
    }
  }
  return sources;
}

export async function buildRagIndex(options={}){
  const startedAt = now();
  const docs=[];
  const files=[];

  for (const src of await projectSources()) {
    await walkFiles(src.root, 'project', src.root, files);
    for (const item of files.splice(0)) {
      const text = await safeRead(item.file);
      docs.push(...chunkText(text, { sourceType: 'project', projectId: src.projectId, path: item.rel, title: item.rel }));
    }
  }

  const memoryRoot = path.join(config.dataDir, 'memory');
  const memoryFiles = [];
  await walkFiles(memoryRoot, 'memory', memoryRoot, memoryFiles);
  for (const item of memoryFiles) {
    const text = await safeRead(item.file);
    docs.push(...chunkText(text, { sourceType: 'memory', path: item.rel, title: item.rel }));
  }

  const wikiRoot = path.join(config.dataDir, 'wiki');
  const wikiFiles = [];
  await walkFiles(wikiRoot, 'wiki', wikiRoot, wikiFiles);
  for (const item of wikiFiles) {
    const text = await safeRead(item.file);
    const parts = item.rel.split(path.sep);
    docs.push(...chunkText(text, { sourceType: 'wiki', projectId: parts[0] || '', path: item.rel, title: item.rel }));
  }

  const df = {};
  for (const d of docs) for (const t of new Set(d.tokens)) df[t]=(df[t]||0)+1;
  const index = { version: 1, engine: 'gitfusion-local-rag', mode: 'offline-keyword-tfidf', builtAt: now(), startedAt, totalDocuments: docs.length, df, docs };
  await writeJson('rag', 'index', index);
  return summarizeIndex(index);
}

export async function ragStatus(){
  const idx = await readJson('rag','index', null);
  if (!idx) return { ready:false, totalDocuments:0, builtAt:null, engine:'gitfusion-local-rag' };
  return summarizeIndex(idx);
}

function summarizeIndex(idx){
  const bySource = {};
  for (const d of idx.docs || []) bySource[d.sourceType] = (bySource[d.sourceType] || 0) + 1;
  return { ready:true, engine: idx.engine || 'gitfusion-local-rag', mode: idx.mode || 'offline-keyword-tfidf', totalDocuments: idx.totalDocuments || idx.docs?.length || 0, builtAt: idx.builtAt, bySource };
}

function scoreDoc(doc, queryTokens, df, total){
  const counts = {};
  for (const t of doc.tokens) counts[t]=(counts[t]||0)+1;
  let score = 0;
  for (const q of queryTokens) {
    const exact = counts[q] || 0;
    const fuzzy = exact ? 0 : doc.tokens.some(t=>t.includes(q) || q.includes(t)) ? 0.25 : 0;
    if (!exact && !fuzzy) continue;
    const idf = Math.log(1 + (total + 1) / ((df[q] || 0) + 1));
    score += (exact + fuzzy) * idf;
  }
  const phrase = normalize(doc.text).includes(queryTokens.join(' ')) ? 2.5 : 0;
  return score + phrase;
}

function excerpt(text, tokens){
  const normalized = normalize(text);
  let pos = -1;
  for (const t of tokens) { pos = normalized.indexOf(t); if (pos >= 0) break; }
  const start = Math.max(0, pos - 120);
  return String(text).slice(start, start + 360).replace(/\s+/g,' ').trim();
}

export async function searchRag(query, options={}){
  const idx = await readJson('rag','index', null);
  if (!idx?.docs?.length) return { ready:false, query, results:[], message:'Índice RAG vazio. Recrie o índice.' };
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return { ready:true, query, results:[] };
  const limit = Math.min(Number(options.limit || 8), 20);
  const projectId = options.projectId || '';
  const docs = idx.docs.filter(d=>!projectId || !d.projectId || d.projectId === projectId);
  const scored = docs.map(d=>({ doc:d, score:scoreDoc(d, queryTokens, idx.df || {}, idx.totalDocuments || docs.length) }))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0, limit)
    .map(x=>({
      id:x.doc.id,
      score:Number(x.score.toFixed(3)),
      sourceType:x.doc.sourceType,
      projectId:x.doc.projectId,
      title:x.doc.title,
      path:x.doc.path,
      chunkIndex:x.doc.chunkIndex,
      excerpt: excerpt(x.doc.text, queryTokens),
      text: x.doc.text
    }));
  return { ready:true, query, results:scored, totalIndexed:idx.totalDocuments || idx.docs.length, builtAt:idx.builtAt };
}

export async function ragContext(query, options={}){
  const found = await searchRag(query, { ...options, limit: options.limit || 5 });
  const context = (found.results || []).map((r,i)=>`[${i+1}] ${r.sourceType}:${r.path}\n${r.excerpt}`).join('\n\n');
  return { ...found, context };
}
