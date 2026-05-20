import fs from 'fs';
import path from 'path';
const root=process.cwd();
const required=[
  'public/apk-autotrainer.js',
  'public/autotrainer-sources.json',
  'public/apk-ai-runtime.js',
  'public/index.html'
];
let ok=true;
for(const f of required){ if(!fs.existsSync(path.join(root,f))){ console.error('missing',f); ok=false; } }
const registry=JSON.parse(fs.readFileSync(path.join(root,'public/autotrainer-sources.json'),'utf8'));
const sources=registry.packs.flatMap(p=>p.sources||[]);
if(sources.length<6){ console.error('registry pequeno demais'); ok=false; }
const runtime=fs.readFileSync(path.join(root,'public/apk-ai-runtime.js'),'utf8');
if(!runtime.includes('GitFusionAutoTrainer')){ console.error('runtime não chama AutoTrainer'); ok=false; }
if(!ok) process.exit(1);
console.log(`AutoTrainer selftest ok: ${registry.packs.length} packs, ${sources.length} fontes.`);
