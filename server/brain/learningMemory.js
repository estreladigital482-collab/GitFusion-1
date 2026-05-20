import fs from 'fs-extra';
import path from 'path';

const ROOT = process.cwd();
const LEARNING_DIR = path.join(ROOT, 'data', 'brain-learning');
const PATTERNS_FILE = path.join(LEARNING_DIR, 'patterns.json');
const EVENTS_FILE = path.join(LEARNING_DIR, 'events.jsonl');
const DECISIONS_FILE = path.join(LEARNING_DIR, 'decisions.jsonl');

function now(){ return new Date().toISOString(); }
function clamp(n, min, max){ return Math.max(min, Math.min(max, Number(n) || 0)); }
function safeKey(parts){ return parts.map(p => String(p || 'unknown').toLowerCase().replace(/[^a-z0-9._:-]+/g, '-')).join('::'); }
async function ensure(){ await fs.ensureDir(LEARNING_DIR); if (!(await fs.pathExists(PATTERNS_FILE))) await fs.writeJson(PATTERNS_FILE, { version: 1, updatedAt: now(), patterns: {} }, { spaces: 2 }); }
async function readPatterns(){ await ensure(); return fs.readJson(PATTERNS_FILE).catch(() => ({ version: 1, updatedAt: now(), patterns: {} })); }
async function writePatterns(db){ db.updatedAt = now(); await ensure(); await fs.writeJson(PATTERNS_FILE, db, { spaces: 2 }); return db; }

function scoreDelta({ outcome='neutral', success=true, risk='low', error='' }) {
  let delta = 1;
  if (success || outcome === 'success') delta += 2;
  if (outcome === 'partial') delta += 0.5;
  if (!success || outcome === 'error' || error) delta -= 2;
  if (risk === 'high') delta -= 0.5;
  return delta;
}

export async function recordLearningEvent({
  runId = 'manual',
  projectId = 'general',
  intent = 'general',
  prompt = '',
  plan = [],
  actions = [],
  result = {},
  provider = 'gitfusion',
  model = 'internal',
  contextSources = [],
  metadata = {}
} = {}) {
  await ensure();
  const ok = result?.ok !== false && !result?.error;
  const outcome = result?.outcome || (ok ? 'success' : 'error');
  const risk = metadata?.risk || result?.risk || 'low';
  const key = safeKey([projectId, intent, model]);
  const db = await readPatterns();
  const current = db.patterns[key] || {
    key,
    projectId,
    intent,
    model,
    provider,
    score: 0,
    confidence: 0,
    uses: 0,
    successes: 0,
    failures: 0,
    lastPrompt: '',
    lastResult: '',
    actionsUsed: {},
    contextSources: [],
    firstSeenAt: now(),
    lastSeenAt: now()
  };

  const delta = scoreDelta({ outcome, success: ok, risk, error: result?.error });
  current.uses += 1;
  current.score = clamp(current.score + delta, -50, 100);
  current.successes += ok ? 1 : 0;
  current.failures += ok ? 0 : 1;
  current.confidence = Number((current.successes / Math.max(1, current.uses)).toFixed(3));
  current.lastPrompt = String(prompt).slice(0, 1200);
  current.lastResult = String(result?.summary || result?.answer || result?.error || outcome).slice(0, 1200);
  current.lastSeenAt = now();
  current.provider = provider;
  current.model = model;
  current.projectId = projectId;
  current.intent = intent;

  for (const a of actions || []) {
    const t = a?.type || a?.id || 'unknown';
    current.actionsUsed[t] = (current.actionsUsed[t] || 0) + 1;
  }
  for (const source of contextSources || []) {
    const label = typeof source === 'string' ? source : (source?.title || source?.path || source?.id || JSON.stringify(source).slice(0,80));
    if (label && !current.contextSources.includes(label)) current.contextSources.push(label);
  }
  current.contextSources = current.contextSources.slice(-30);

  db.patterns[key] = current;
  await writePatterns(db);

  const event = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    runId,
    projectId,
    intent,
    prompt: String(prompt).slice(0, 4000),
    outcome,
    ok,
    delta,
    patternKey: key,
    scoreAfter: current.score,
    confidenceAfter: current.confidence,
    planSteps: plan.length,
    actionCount: actions.length,
    provider,
    model,
    result: {
      summary: String(result?.summary || result?.answer || '').slice(0, 2000),
      error: result?.error || null
    },
    metadata,
    createdAt: now()
  };
  await fs.appendFile(EVENTS_FILE, JSON.stringify(event) + '\n');
  return { pattern: current, event };
}

export async function recordDecision({ runId='manual', projectId='general', decision='', reason='', confidence=0.5, risk='low', tags=[] } = {}) {
  await ensure();
  const record = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, runId, projectId, decision, reason, confidence: clamp(confidence,0,1), risk, tags, createdAt: now() };
  await fs.appendFile(DECISIONS_FILE, JSON.stringify(record) + '\n');
  return record;
}

export async function getLearningSummary({ projectId, limit = 10 } = {}) {
  const db = await readPatterns();
  const patterns = Object.values(db.patterns || {})
    .filter(p => !projectId || p.projectId === projectId)
    .sort((a,b) => (b.score - a.score) || (b.uses - a.uses))
    .slice(0, limit);
  return {
    ok: true,
    updatedAt: db.updatedAt,
    totalPatterns: Object.keys(db.patterns || {}).length,
    projectId: projectId || 'all',
    topPatterns: patterns,
    storage: LEARNING_DIR
  };
}

export async function suggestFromLearning({ projectId='general', intent='general', limit=5 } = {}) {
  const db = await readPatterns();
  const candidates = Object.values(db.patterns || {})
    .filter(p => (!projectId || p.projectId === projectId || p.projectId === 'general') && (!intent || p.intent === intent))
    .sort((a,b) => (b.confidence - a.confidence) || (b.score - a.score))
    .slice(0, limit);
  return candidates.map(p => ({
    patternKey: p.key,
    confidence: p.confidence,
    score: p.score,
    uses: p.uses,
    recommendedActions: Object.entries(p.actionsUsed || {}).sort((a,b)=>b[1]-a[1]).map(([type,count])=>({ type, count })).slice(0,5),
    reason: `Padrão usado ${p.uses} vez(es), confiança ${(p.confidence*100).toFixed(0)}%, score ${p.score}.`
  }));
}

export async function readLearningEvents({ limit=30 } = {}) {
  await ensure();
  if (!(await fs.pathExists(EVENTS_FILE))) return [];
  const lines = (await fs.readFile(EVENTS_FILE, 'utf8')).trim().split('\n').filter(Boolean);
  return lines.slice(-limit).map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean).reverse();
}
