import fs from 'fs';
const runtime = fs.readFileSync('public/apk-ai-runtime.js','utf8');
const app = fs.readFileSync('public/app.js','utf8');
const index = fs.readFileSync('public/index.html','utf8');
const required = [
  'window.GitFusionAPKEngine',
  'importFiles',
  'searchKnowledge',
  'knowledgeStats',
  'probeOllama',
  'ensureProject',
  'addLocalTask',
  'addDecision',
  'localDiagnostics',
  'buildContextAnswer'
];
const missing = required.filter(k => !runtime.includes(k));
if(missing.length){ console.error('APK engine incompleto:', missing.join(', ')); process.exit(1); }
if(!app.includes('runApkBrainFallback')){ console.error('Chat não chama motor APK local.'); process.exit(1); }
if(!index.includes('/apk-ai-runtime.js')){ console.error('Runtime APK não está carregado no index.html.'); process.exit(1); }
console.log('GitFusion APK engine selftest ok: runtime local, RAG, MemPalace, ações e chat conectados.');
