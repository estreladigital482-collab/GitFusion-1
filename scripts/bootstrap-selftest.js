import fs from 'node:fs';
const required=['public/apk-bootstrap.js','public/bootstrap-packages.json','public/sw.js'];
let ok=true;
for(const f of required){ if(!fs.existsSync(f)){ console.error('missing',f); ok=false; } else console.log('ok',f); }
const reg=JSON.parse(fs.readFileSync('public/bootstrap-packages.json','utf8'));
if(!Array.isArray(reg.packages)||reg.packages.length<3){ console.error('registry packages invalid'); ok=false; }
for(const p of reg.packages){ if(!p.id||!p.kind||!Array.isArray(p.files)){ console.error('bad package',p.id); ok=false; } }
if(!ok) process.exit(1);
console.log('GitFusion bootstrap selftest ok:',reg.packages.map(p=>p.id).join(', '));
