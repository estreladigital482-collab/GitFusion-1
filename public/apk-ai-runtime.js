/* GitFusion 16.2 APK-first AI runtime
   Real offline foundation for APK:
   - MemPalace in localStorage
   - Local Knowledge Base in IndexedDB for imported files/folders
   - RAG over chats + memories + imported docs
   - Runtime router: embedded placeholder, Ollama local, OpenAI-compatible online, symbolic offline
   - Honest responses when no LLM is available
*/
(function(){
  const STORE = 'gitfusion.apkBrain.v16';
  const SETTINGS = 'gitfusion.apkBrain.settings.v16';
  const DB_NAME = 'gitfusion-local-knowledge-v16-2';
  const DB_VERSION = 1;
  const MAX_TEXT_BYTES = 1_500_000;
  const CHUNK_SIZE = 2400;
  const CHUNK_OVERLAP = 280;
  const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));
  const now = ()=>new Date().toISOString();
  const uid = (p='run')=>`${p}_${Date.now()}_${Math.random().toString(16).slice(2,8)}`;
  const clamp = n => Math.max(0, Math.min(100, Number(n||0)));

  function readJson(key, fallback){ try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
  function writeJson(key, value){ localStorage.setItem(key, JSON.stringify(value)); return value; }
  function store(){ return readJson(STORE, { memories: [], decisions: [], events: [], projects: {}, createdAt: now() }); }
  function saveStore(s){ s.updatedAt = now(); return writeJson(STORE, s); }
  function settings(){ return {
    runtime:'auto',
    ollamaUrl:'http://127.0.0.1:11434',
    ollamaModel:'tinyllama',
    onlineBaseUrl:'',
    onlineModel:'gpt-4o-mini',
    onlineToken:'',
    embeddedModel:'none',
    ...readJson(SETTINGS,{})
  }; }
  function saveSettings(input){ return writeJson(SETTINGS, { ...settings(), ...input, updatedAt: now() }); }
  function hash(str){ let h=2166136261; for(let i=0;i<String(str).length;i++){ h^=String(str).charCodeAt(i); h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24); } return (h>>>0).toString(16); }
  function words(t){ return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9_./:-]+/).filter(w=>w.length>2); }
  function score(text, query){ const q=words(query); if(!q.length) return 0; const t=words(text); const bag=new Map(); for(const w of t) bag.set(w,(bag.get(w)||0)+1); let s=0; for(const w of q){ if(bag.has(w)) s += 3 + Math.min(4, bag.get(w)); for(const k of bag.keys()) if(k.includes(w) || w.includes(k)) { s += 0.35; break; } } return s; }

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains('docs')){
          const docs=db.createObjectStore('docs',{keyPath:'id'});
          docs.createIndex('projectId','projectId',{unique:false});
          docs.createIndex('path','path',{unique:false});
          docs.createIndex('hash','hash',{unique:false});
        }
        if(!db.objectStoreNames.contains('chunks')){
          const chunks=db.createObjectStore('chunks',{keyPath:'id'});
          chunks.createIndex('docId','docId',{unique:false});
          chunks.createIndex('projectId','projectId',{unique:false});
          chunks.createIndex('source','source',{unique:false});
        }
        if(!db.objectStoreNames.contains('meta')) db.createObjectStore('meta',{keyPath:'key'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  function txStore(db, name, mode='readonly'){ return db.transaction(name, mode).objectStore(name); }
  function promisify(req){ return new Promise((resolve,reject)=>{ req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
  async function putAll(storeName, items){ const db=await openDb(); await new Promise((resolve,reject)=>{ const tx=db.transaction(storeName,'readwrite'); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); const st=tx.objectStore(storeName); for(const item of items) st.put(item); }); db.close(); }
  async function getAll(storeName){ const db=await openDb(); const out=await promisify(txStore(db,storeName).getAll()); db.close(); return out||[]; }
  async function clearKnowledge(){ const db=await openDb(); await new Promise((resolve,reject)=>{ const tx=db.transaction(['docs','chunks','meta'],'readwrite'); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.objectStore('docs').clear(); tx.objectStore('chunks').clear(); tx.objectStore('meta').put({key:'stats', docs:0,chunks:0,bytes:0,updatedAt:now()}); }); db.close(); }

  function remember(item){
    const s = store();
    const text = String(item.text || item.content || '').trim();
    if(!text) return s;
    const existing = s.memories.find(m=>m.hash === hash(text));
    if(existing){ existing.weight = (existing.weight||1)+1; existing.lastSeenAt = now(); existing.tags = Array.from(new Set([...(existing.tags||[]), ...(item.tags||[])])); }
    else s.memories.unshift({ id:uid('mem'), hash:hash(text), text, projectId:item.projectId||'general', tags:item.tags||[], weight:item.weight||1, source:item.source||'chat', createdAt:now(), lastSeenAt:now() });
    s.memories = s.memories.slice(0, 1200);
    s.events.unshift({ id:uid('evt'), type:item.type||'memory', text:text.slice(0,220), projectId:item.projectId||'general', at:now() });
    s.events = s.events.slice(0, 1500);
    return saveStore(s);
  }

  function ensureProject(projectId='general', patch={}){
    const s=store();
    if(!s.projects) s.projects={};
    if(!s.projects[projectId]){
      s.projects[projectId]={ id:projectId, name:patch.name||projectId, description:patch.description||'', chats:[], tasks:[], files:[], decisions:[], createdAt:now(), updatedAt:now() };
    }
    s.projects[projectId]={...s.projects[projectId], ...patch, updatedAt:now()};
    saveStore(s);
    return s.projects[projectId];
  }
  function listProjects(){ const s=store(); return Object.values(s.projects||{}).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))); }
  function addLocalTask(projectId='general', task={}){
    const p=ensureProject(projectId);
    const t={ id:uid('task'), title:task.title||'Nova tarefa', description:task.description||'', status:task.status||'planned', progress:clamp(task.progress||0), createdAt:now(), updatedAt:now(), source:task.source||'apk-brain' };
    p.tasks=[t, ...(p.tasks||[])].slice(0,400);
    ensureProject(projectId,p);
    remember({text:`Task criada: ${t.title}
${t.description}`, projectId, tags:['task'], source:'apk-task', weight:2});
    return t;
  }
  function addDecision(projectId='general', decision={}){
    const p=ensureProject(projectId);
    const d={ id:uid('decision'), title:decision.title||'Decisão', text:decision.text||'', reason:decision.reason||'', createdAt:now(), source:decision.source||'apk-brain' };
    p.decisions=[d, ...(p.decisions||[])].slice(0,300);
    ensureProject(projectId,p);
    remember({text:`Decisão: ${d.title}
${d.text}
Motivo: ${d.reason}`, projectId, tags:['decision'], source:'apk-decision', weight:3});
    return d;
  }
  function localDiagnostics(){
    const cfg=settings();
    const s=store();
    return {
      ok:true, mode:localStorage.getItem('gitfusion.apkRuntime')||cfg.runtime||'auto',
      browser:{ indexedDB:!!window.indexedDB, localStorage:!!window.localStorage, filePicker:!!window.showDirectoryPicker || !!document.createElement('input').webkitdirectory },
      projects:Object.keys(s.projects||{}).length, memories:(s.memories||[]).length, events:(s.events||[]).length,
      ollama:{ url:cfg.ollamaUrl, model:cfg.ollamaModel }, online:{ configured:Boolean(cfg.onlineBaseUrl && cfg.onlineToken), model:cfg.onlineModel },
      updatedAt:now()
    };
  }

  function isTextFile(file){
    const name=(file.name||'').toLowerCase();
    const textExt=/\.(txt|md|markdown|js|mjs|cjs|ts|tsx|jsx|json|html|css|scss|sass|xml|svg|yml|yaml|toml|ini|env|example|py|java|kt|swift|go|rs|c|cpp|h|hpp|cs|php|rb|sh|bash|zsh|ps1|sql|dockerfile|gradle|properties|lock|gitignore|npmrc|prettierrc|eslintrc)$/;
    return (file.type||'').startsWith('text/') || textExt.test(name) || ['package.json','Dockerfile','README','LICENSE','Makefile','gradlew'].includes(file.name);
  }
  async function fileText(file){
    if(file.size > MAX_TEXT_BYTES) throw new Error(`arquivo grande demais (${Math.round(file.size/1024)} KB)`);
    return await file.text();
  }
  function chunkText(text){
    const clean=String(text||'').replace(/\r\n/g,'\n');
    const chunks=[];
    let i=0, idx=0;
    while(i<clean.length){
      const part=clean.slice(i, i+CHUNK_SIZE);
      if(part.trim()) chunks.push({idx:idx++, text:part});
      i += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks;
  }
  async function importFiles(fileList, opts={}){
    const files=Array.from(fileList||[]);
    const projectId=opts.projectId || 'apk-local';
    const docs=[], chunks=[], skipped=[];
    let bytes=0;
    for(const file of files){
      const path=file.webkitRelativePath || file.relativePath || file.name;
      if(!isTextFile(file)){ skipped.push({path, reason:'binário ou tipo não textual'}); continue; }
      try{
        const text=await fileText(file);
        const id=`doc_${hash(projectId+'|'+path+'|'+file.size+'|'+file.lastModified)}`;
        const doc={ id, projectId, source:'imported-file', name:file.name, path, type:file.type||'text/plain', size:file.size, hash:hash(text), createdAt:now(), updatedAt:now(), preview:text.slice(0,600) };
        docs.push(doc); bytes += file.size;
        for(const ch of chunkText(text)) chunks.push({ id:`chunk_${id}_${ch.idx}`, docId:id, projectId, source:'imported-file', path, name:file.name, idx:ch.idx, text:ch.text, weight:1, createdAt:now(), updatedAt:now() });
      }catch(e){ skipped.push({path, reason:e.message}); }
    }
    if(docs.length) await putAll('docs', docs);
    if(chunks.length) await putAll('chunks', chunks);
    const db=await openDb();
    await promisify(txStore(db,'meta','readwrite').put({key:'stats', docs:(await getAll('docs')).length, chunks:(await getAll('chunks')).length, bytes, lastImportDocs:docs.length, lastImportChunks:chunks.length, skipped:skipped.length, updatedAt:now()}));
    db.close();
    remember({text:`Importação local concluída: ${docs.length} arquivos, ${chunks.length} chunks, ${skipped.length} ignorados.`, projectId, tags:['import','knowledge'], source:'local-importer', weight:3});
    return { importedDocs:docs.length, importedChunks:chunks.length, skipped, bytes, projectId };
  }
  async function knowledgeStats(){
    const docs=await getAll('docs'); const chunks=await getAll('chunks');
    const bytes=docs.reduce((a,d)=>a+(d.size||0),0);
    return {docs:docs.length, chunks:chunks.length, bytes, updatedAt:now()};
  }
  async function exportKnowledge(){ return { version:'16.2', exportedAt:now(), docs:await getAll('docs'), chunks:await getAll('chunks'), brain:store() }; }
  async function importKnowledgeBackup(data){
    const docs=Array.isArray(data?.docs)?data.docs:[]; const chunks=Array.isArray(data?.chunks)?data.chunks:[];
    if(docs.length) await putAll('docs', docs);
    if(chunks.length) await putAll('chunks', chunks);
    if(data?.brain?.memories) saveStore({...store(), memories:[...data.brain.memories, ...store().memories].slice(0,1200)});
    return knowledgeStats();
  }
  async function searchKnowledge(query, opts={}){
    const chunks=await getAll('chunks');
    const projectId=opts.projectId;
    return chunks
      .filter(c=>!projectId || projectId==='general' || c.projectId===projectId || c.projectId==='apk-local')
      .map(c=>({...c, _score:score(c.text+' '+c.path, query)+Math.log1p(c.weight||1)}))
      .filter(c=>c._score>0)
      .sort((a,b)=>b._score-a._score)
      .slice(0, opts.limit||10);
  }
  function collectChatDocs(chats=[]){
    const docs=[];
    for(const c of chats||[]){ for(const m of c.messages||[]){ if(m.text) docs.push({ id:`chat:${c.id}:${docs.length}`, source:'chat', projectId:c.projectId||'general', text:`${c.title||'Chat'} · ${m.role}: ${m.text}` }); } }
    return docs;
  }
  async function rag(query, opts={}){
    const s=store();
    const memoryDocs=[...s.memories.map(m=>({ ...m, source:m.source||'memory' })), ...collectChatDocs(opts.chats||[])];
    const memRanked=memoryDocs.map(d=>({ ...d, _score:score(d.text, query) + Math.log1p(d.weight||1) })).filter(d=>d._score>0);
    const knowledge=await searchKnowledge(query,{projectId:opts.projectId, limit:opts.limit||10});
    const ranked=[...knowledge.map(k=>({...k, source:'knowledge', text:`${k.path}\n${k.text}`})), ...memRanked]
      .sort((a,b)=>b._score-a._score)
      .slice(0, opts.limit||10);
    return { sources:ranked, context: ranked.map((d,i)=>`[${i+1}] ${d.source} ${d.projectId||'general'} ${d.path?('· '+d.path):''}: ${String(d.text||'').slice(0,1400)}`).join('\n\n') };
  }

  function detectIntent(prompt){
    const t=String(prompt||'').toLowerCase();
    if(/importar|indexar|pasta|conhecimento local|base local|arquivos locais/.test(t)) return 'import-knowledge';
    if(/apk|android|gradle|capacitor|termux/.test(t)) return 'android-build';
    if(/juntar|mesclar|merge|unir|repositorio|repositório/.test(t)) return 'merge-projects';
    if(/erro|bug|falha|corrigir|consertar|não funciona|nao funciona/.test(t)) return 'debug';
    if(/criar|gerar|implementar|programar|codar|arquivo/.test(t)) return 'code-task';
    if(/analisa|analisar|explica|revisar|verifica/.test(t)) return 'analysis';
    return 'chat';
  }
  function stepsFor(intent){
    const base=[['receive','Ler mensagem',8],['memory','Salvar sinal no MemPalace',18],['rag','Buscar MemPalace + base local',34],['runtime','Escolher motor de IA',48]];
    const spec={
      'import-knowledge':[['scan','Verificar base importada',62],['index','Usar índice local offline',78],['plan','Explicar próximos passos',90]],
      'android-build':[['diagnose','Diagnosticar Android/Termux',62],['plan','Montar próximos comandos',78],['safety','Checar riscos antes de executar',90]],
      'merge-projects':[['repos','Separar fontes e repositórios',62],['conflicts','Mapear conflitos prováveis',78],['plan','Criar plano de merge seguro',90]],
      'code-task':[['files','Identificar arquivos alvo',62],['patch','Planejar alterações',78],['verify','Definir verificação',90]],
      'debug':[['error','Isolar erro principal',62],['cause','Gerar hipótese de causa',78],['fix','Sugerir correção verificável',90]],
      'analysis':[['context','Organizar contexto',72],['answer','Preparar resposta',90]],
      'chat':[['answer','Preparar resposta',90]]
    };
    return [...base, ...(spec[intent]||spec.chat), ['done','Finalizar',100]].map(([id,title,percent],i)=>({id,title,percent,status:'pending',index:i+1}));
  }
  async function probeOllama(){
    const cfg=settings();
    try{
      const res=await fetch(`${cfg.ollamaUrl.replace(/\/$/,'')}/api/tags`, { cache:'no-store' });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      return { available:true, models:(data.models||[]).map(m=>m.name), url:cfg.ollamaUrl };
    }catch(e){ return { available:false, error:e.message, url:cfg.ollamaUrl }; }
  }
  async function callOllama(prompt, context){
    const cfg=settings();
    const res=await fetch(`${cfg.ollamaUrl.replace(/\/$/,'')}/api/chat`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ model:cfg.ollamaModel, stream:false, messages:[ {role:'system', content:'Você é o GitFusion Brain. Use MemPalace/RAG local. Responda em português, seja prático e honesto. Se precisar de ação no APK, explique limitações e próximo passo.'+(context?'\nContexto local:\n'+context:'')}, {role:'user', content:prompt} ] }) });
    if(!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data=await res.json();
    return data.message?.content || '';
  }
  async function callOnline(prompt, context){
    const cfg=settings();
    if(!cfg.onlineBaseUrl || !cfg.onlineToken) throw new Error('API online não configurada');
    const base=cfg.onlineBaseUrl.replace(/\/$/,'').replace(/\/v1$/,'');
    const res=await fetch(`${base}/v1/chat/completions`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${cfg.onlineToken}`}, body:JSON.stringify({ model:cfg.onlineModel, temperature:0.2, messages:[ {role:'system', content:'Você é o GitFusion Brain. Responda em português e use o contexto local quando existir. '+(context?'\nContexto:\n'+context:'')}, {role:'user', content:prompt} ] }) });
    if(!res.ok) throw new Error(`Online HTTP ${res.status}`);
    const data=await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
  function extractActionHints(prompt, intent){
    const hints=[];
    const t=String(prompt||'').toLowerCase();
    if(intent==='android-build' || /apk|gradle|capacitor|termux/.test(t)){
      hints.push('Verificar package.json, Capacitor, Android SDK, JDK, aapt2 ARM64 e variables.gradle.');
      hints.push('Gerar APK debug apenas depois de npm run build e cap sync/add android.');
    }
    if(intent==='merge-projects'){
      hints.push('Importar as duas pastas/projetos para a Base local do APK.');
      hints.push('Comparar package.json, estrutura src/public/server, configs e assets antes de mesclar.');
      hints.push('Registrar conflitos como tasks e só aplicar alterações com backup.');
    }
    if(intent==='code-task'){
      hints.push('Buscar arquivos relevantes no índice local antes de sugerir alteração.');
      hints.push('Criar patch pequeno, reversível e com explicação do motivo.');
    }
    if(intent==='debug'){
      hints.push('Usar a mensagem de erro como consulta no RAG local.');
      hints.push('Separar causa provável, arquivo provável e comando de verificação.');
    }
    if(!hints.length) hints.push('Usar MemPalace + base local antes de responder.');
    return hints;
  }

  function summarizeSources(sources=[]){
    if(!sources.length) return 'Nenhuma fonte local relevante encontrada ainda. Importe arquivos/pastas na Memória do projeto para aumentar a base offline.';
    return sources.slice(0,5).map((src,i)=>{
      const label=src.path||src.name||src.source||`fonte-${i+1}`;
      const text=String(src.text||'').replace(/\s+/g,' ').slice(0,360);
      return `${i+1}. ${label}: ${text}`;
    }).join('\n');
  }

  async function symbolicAnswer(prompt, intent, ragResult, runtimeReport){
    const stats=await knowledgeStats().catch(()=>({docs:0,chunks:0,bytes:0}));
    const diag=localDiagnostics();
    const hasContext=Boolean(ragResult?.sources?.length);
    const hints=extractActionHints(prompt,intent);
    const lines=[];
    lines.push(`Entendi seu pedido: ${prompt}`);
    lines.push('');
    lines.push(`Modo real no APK: MemPalace + RAG local + executor de planejamento. Base offline: ${stats.docs} arquivos, ${stats.chunks} trechos, ${diag.memories} memórias.`);
    if(runtimeReport) lines.push(`Motor externo: ${runtimeReport}.`);
    lines.push('');
    if(hasContext){
      lines.push('O que encontrei na base local:');
      lines.push(summarizeSources(ragResult.sources));
      lines.push('');
      lines.push('Resposta baseada no contexto local:');
      lines.push(buildContextAnswer(prompt, intent, ragResult.sources));
    } else {
      lines.push('Ainda não encontrei conteúdo local suficiente para responder como LLM completo. Mesmo offline, posso trabalhar com memória, indexação, plano, tasks e diagnóstico.');
    }
    lines.push('');
    lines.push('Ações que vou registrar agora:');
    hints.forEach((h,i)=>lines.push(`${i+1}. ${h}`));
    lines.push('');
    lines.push('Para eu agir com mais precisão dentro do APK: importe a pasta do projeto em Memória → Base local do APK. Depois pergunte sobre arquivos, erros, merge, arquitetura ou próximos passos.');
    return lines.join('\n');
  }

  function buildContextAnswer(prompt, intent, sources=[]){
    const combined=sources.map(s=>String(s.text||'')).join('\n---\n').slice(0,5000);
    const out=[];
    if(intent==='debug'){
      out.push('Diagnóstico inicial: encontrei trechos que podem conter a causa ou arquivos relacionados ao erro. Compare o erro com as fontes listadas acima e priorize o primeiro arquivo citado.');
    } else if(intent==='code-task'){
      out.push('Implementação sugerida: use os arquivos encontrados como alvo principal. Antes de alterar, crie backup/snapshot, aplique uma mudança pequena e rode o teste/build correspondente.');
    } else if(intent==='merge-projects'){
      out.push('Plano de mesclagem: trate cada pasta importada como fonte. Preserve o projeto base, copie módulos isolados, compare configs e gere tasks para conflitos.');
    } else if(intent==='android-build'){
      out.push('Plano Android/APK: priorize Capacitor 6, compileSdk compatível, JDK instalado, SDK local em local.properties e aapt2 ARM64 do Termux.');
    } else if(intent==='analysis'){
      out.push('Análise: a base local indica os pontos acima como mais relevantes. Vou usar isso como memória forte para próximas perguntas.');
    } else {
      out.push('Com base no que encontrei, esses trechos são os mais relevantes para sua pergunta. Posso transformar isso em plano, tasks ou diagnóstico se você pedir.');
    }
    const important=combined.split('\n').filter(l=>l.trim().length>30).slice(0,6).map(l=>'- '+l.trim().slice(0,220));
    if(important.length){ out.push(''); out.push('Trechos-chave:'); out.push(...important); }
    return out.join('\n');
  }



  async function fetchPackText(path){
    const res = await fetch(path, { cache:'no-store' });
    if(!res.ok) throw new Error(`Falha ao ler pacote: ${path} HTTP ${res.status}`);
    return await res.text();
  }

  async function importTextDocument({projectId='gitfusion-ai-pack', path, name, text, source='bundled-ai-pack', weight=3}){
    const id = `doc_${hash(projectId+'|'+path+'|'+hash(text))}`;
    const doc = { id, projectId, source, name:name||path.split('/').pop(), path, type:'text/markdown', size:String(text||'').length, hash:hash(text), createdAt:now(), updatedAt:now(), preview:String(text||'').slice(0,800), bundled:true };
    const chunks = chunkText(text).map(ch => ({ id:`chunk_${id}_${ch.idx}`, docId:id, projectId, source, path, name:doc.name, idx:ch.idx, text:ch.text, weight, createdAt:now(), updatedAt:now(), bundled:true }));
    await putAll('docs',[doc]);
    if(chunks.length) await putAll('chunks', chunks);
    return {doc, chunks:chunks.length};
  }

  async function importBundledAIPack(){
    const base = '/gitfusion-ai-pack';
    const manifest = JSON.parse(await fetchPackText(`${base}/manifests/pack.json`));
    const projectId = 'gitfusion-ai-pack';
    ensureProject(projectId, { name:'GitFusion AI Pack', description:'Pacote local embutido no APK com docs, datasets e manifesto de modelos.' });
    const imported = { docs:0, chunks:0, datasets:0, models:manifest.models||[], errors:[] };
    for(const rel of manifest.docs || []){
      try{
        const text = await fetchPackText(`${base}/${rel}`);
        const r = await importTextDocument({projectId, path:rel, name:rel.split('/').pop(), text, source:'bundled-doc', weight:5});
        imported.docs += 1; imported.chunks += r.chunks;
        remember({ text:`Documento do AI Pack importado: ${rel}\n${text.slice(0,700)}`, projectId, tags:['ai-pack','doc','bootstrap'], source:'bundled-ai-pack', weight:5 });
      }catch(e){ imported.errors.push(`${rel}: ${e.message}`); }
    }
    try{
      const seed = await fetchPackText(`${base}/datasets/seed.jsonl`);
      const rows = seed.split(/\n+/).map(l=>l.trim()).filter(Boolean);
      for(const row of rows){
        try{
          const item = JSON.parse(row);
          const text = `Dataset seed\nInstruction: ${item.instruction||''}\nResponse: ${item.response||''}`;
          remember({ text, projectId, tags:['dataset','seed','ai-pack'], source:'bundled-dataset', weight:6 });
          imported.datasets += 1;
        }catch(e){ imported.errors.push(`dataset row: ${e.message}`); }
      }
      await importTextDocument({projectId, path:'datasets/seed.jsonl', name:'seed.jsonl', text:seed, source:'bundled-dataset', weight:4});
    }catch(e){ imported.errors.push(`datasets/seed.jsonl: ${e.message}`); }
    const cfg = readJson('gitfusion.aiPack.registry.v16', { packs:[], installed:{}, updatedAt:null });
    cfg.packs = Array.from(new Map([...(cfg.packs||[]), manifest].map(x=>[x.name||x.id||'GitFusion AI Pack', x])).values());
    cfg.installed[manifest.name || 'GitFusion AI Pack'] = { version:manifest.version||'0.1.0', importedAt:now(), ...imported };
    cfg.updatedAt = now();
    writeJson('gitfusion.aiPack.registry.v16', cfg);
    const db=await openDb();
    await promisify(txStore(db,'meta','readwrite').put({key:'bundled-ai-pack', manifest, imported, updatedAt:now()}));
    db.close();
    addDecision(projectId, { title:'AI Pack embutido importado', text:`Docs: ${imported.docs}; chunks: ${imported.chunks}; datasets: ${imported.datasets}; modelos declarados: ${(manifest.models||[]).map(m=>m.id).join(', ')}`, reason:'Primeiro boot/importação local para APK offline.', source:'ai-pack-runtime' });
    return { ok:true, manifest, imported };
  }

  async function ensureBundledPackImported(onUpdate=()=>{}){
    const key='gitfusion.aiPack.bundledImported.v16.8';
    if(localStorage.getItem(key)==='yes') return {ok:true, skipped:true};
    onUpdate({ current:'Importando GitFusion AI Pack embutido', progress:10 });
    const result = await importBundledAIPack();
    localStorage.setItem(key,'yes');
    onUpdate({ current:'AI Pack importado e indexado', progress:28, aiPack:result.imported });
    return result;
  }

  async function runChat({ prompt, chats=[], projectId='general', mode=null, onUpdate=()=>{} }){
    if(window.GitFusionAutoTrainer?.maybeHandleChatCommand){
      const trained = await window.GitFusionAutoTrainer.maybeHandleChatCommand(prompt,{projectId,onUpdate});
      if(trained){
        const run={ id:uid('autotrainer-chat'), status:'completed', provider:'autotrainer', model:'local-knowledge-pipeline', progress:100, intent:'self-learning', mode:mode||'auto', estimateMinutes:3, createdAt:now(), updatedAt:now(), current:'AutoTrainer concluído', answer:trained.text, steps:[{id:'autotrainer',title:'Baixar fontes, gerar dataset e alimentar RAG',status:'done',percent:100}] };
        remember({ text:`AutoTrainer executado via chat: ${prompt}
${trained.text}`, projectId, tags:['autotrainer','chat-command'], source:'autotrainer', weight:6 });
        onUpdate({...run});
        return run;
      }
    }
    await ensureBundledPackImported(onUpdate).catch(e=>{
      console.warn('GitFusion AI Pack import failed', e);
      onUpdate({ current:'AI Pack embutido não importou: '+e.message, progress:8 });
    });
    const cfg=settings();
    const runtime = mode || localStorage.getItem('gitfusion.apkRuntime') || cfg.runtime || 'auto';
    const intent=detectIntent(prompt);
    const run={ id:uid('apkchat'), status:'running', provider:'pending', model:'pending', progress:2, intent, mode:runtime, estimateMinutes:1, createdAt:now(), steps:stepsFor(intent), current:'Iniciando motor local do APK', answer:'' };
    const emit=async(stepId, status, current)=>{ const st=run.steps.find(s=>s.id===stepId); if(st){ st.status=status; run.progress=clamp(Math.max(run.progress, st.percent)); } run.current=current||st?.title||run.current; run.updatedAt=now(); onUpdate({...run}); await sleep(240); };
    onUpdate({...run});
    await emit('receive','done','Mensagem recebida no APK');
    remember({ text:prompt, projectId, tags:[intent,'user'], source:'chat', type:'user-message' });
    await emit('memory','done','MemPalace atualizado');
    const ragResult=await rag(prompt,{chats, projectId, limit:10});
    await emit('rag','done', ragResult.sources.length ? `${ragResult.sources.length} fontes locais encontradas` : 'Sem fonte local relevante ainda');
    let runtimeReport='';
    try{
      if(runtime==='embedded') throw new Error('embedded GGUF ainda não empacotado no APK');
      if(runtime==='offline' || runtime==='ollama' || runtime==='auto'){
        const ol=await probeOllama();
        runtimeReport = ol.available ? `Ollama disponível (${ol.models.join(', ')||'sem modelos listados'})` : `Ollama indisponível (${ol.error||'sem resposta'})`;
        await emit('runtime','done', ol.available ? 'Usando Ollama local' : 'Ollama local não encontrado');
        if(ol.available){ run.provider='ollama'; run.model=settings().ollamaModel; onUpdate({...run}); run.answer=await callOllama(prompt, ragResult.context); }
      }
      if(!run.answer && (runtime==='online' || runtime==='auto')){
        await emit('runtime','running','Tentando API online configurada');
        run.provider='openai-compatible'; run.model=settings().onlineModel; onUpdate({...run});
        run.answer=await callOnline(prompt, ragResult.context);
      }
      if(!run.answer){ run.provider='apk-symbolic'; run.model='mempalace-rag-indexeddb'; run.answer=await symbolicAnswer(prompt,intent,ragResult,runtimeReport); }
    }catch(e){
      runtimeReport = runtimeReport || e.message;
      run.provider='apk-symbolic'; run.model='mempalace-rag-indexeddb'; run.engineError=e.message;
      run.answer=await symbolicAnswer(prompt,intent,ragResult,runtimeReport);
    }
    for(const s of run.steps.filter(x=>!['receive','memory','rag','runtime','done'].includes(x.id))){
      if(['plan','fix','patch','conflicts','diagnose','index'].includes(s.id)){
        addLocalTask(projectId,{title:s.title,description:`Gerado pelo APK Brain para: ${prompt}`,status:'planned',progress:s.percent,source:'apk-brain-step'});
      }
      await emit(s.id,'done',s.title);
    }
    addDecision(projectId,{title:`Resposta ${intent}`, text:run.answer.slice(0,1200), reason:`Provider: ${run.provider}; fontes locais: ${ragResult.sources.length}`, source:'apk-brain'});
    remember({ text:`Pergunta: ${prompt}\nResposta: ${run.answer}`, projectId, tags:[intent,run.provider,'answer'], source:'assistant', weight:2, type:'assistant-answer' });
    await emit('done','done','Resposta final salva na memória');
    run.status='completed'; run.progress=100; run.current='Concluído no APK'; run.updatedAt=now();
    onUpdate({...run});
    return run;
  }

  window.GitFusionAPKEngine = { runChat, settings, saveSettings, store, remember, rag, probeOllama, importFiles, searchKnowledge, knowledgeStats, clearKnowledge, exportKnowledge, importKnowledgeBackup, importBundledAIPack, ensureBundledPackImported, ensureProject, listProjects, addLocalTask, addDecision, localDiagnostics };
})();
