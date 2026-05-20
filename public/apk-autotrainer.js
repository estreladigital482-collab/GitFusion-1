(function(){
  const DB='gitfusion-autotrainer-v1';
  const STORE='jobs';
  const now=()=>new Date().toISOString();
  const uid=(p='train')=>`${p}_${Date.now()}_${Math.random().toString(16).slice(2,8)}`;
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const q=(id)=>document.getElementById(id);
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const fmtBytes=(n)=>{n=Number(n||0); if(n<1024) return n+' B'; if(n<1048576) return (n/1024).toFixed(1)+' KB'; return (n/1048576).toFixed(1)+' MB';};
  const hash=(str)=>{ let h=2166136261; str=String(str||''); for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(16); };

  function db(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB,1);
      req.onupgradeneeded=()=>{ const d=req.result; if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE,{keyPath:'id'}); };
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
  async function putJob(job){ const d=await db(); await new Promise((resolve,reject)=>{ const tx=d.transaction(STORE,'readwrite'); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.objectStore(STORE).put(job); }); d.close(); return job; }
  async function listJobs(){ const d=await db(); const out=await new Promise((resolve,reject)=>{ const tx=d.transaction(STORE,'readonly'); const r=tx.objectStore(STORE).getAll(); r.onsuccess=()=>resolve(r.result||[]); r.onerror=()=>reject(r.error); }); d.close(); return out.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))); }

  async function loadRegistry(){
    const res=await fetch('/autotrainer-sources.json', {cache:'no-store'});
    if(!res.ok) throw new Error('registry AutoTrainer indisponível');
    return res.json();
  }
  function sourceScore(src, topic){
    const t=String(topic||'').toLowerCase();
    const hay=[src.id, src.url, ...(src.tags||[])].join(' ').toLowerCase();
    if(!t.trim()) return 1;
    return t.split(/\s+/).filter(Boolean).reduce((a,w)=>a+(hay.includes(w)?2:0),0);
  }
  async function plannedSources(topic='', extraUrls=''){
    const reg=await loadRegistry();
    const sources=[];
    for(const pack of reg.packs||[]){
      for(const src of pack.sources||[]) sources.push({...src, packId:pack.id, packTitle:pack.title, score:sourceScore(src,topic)});
    }
    const extras=String(extraUrls||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map((url,i)=>({id:`extra-${i+1}-${hash(url)}`, type:'url', url, license:'user-provided', tags:['extra','user-approved'], packId:'user-extra', packTitle:'Fontes extras', score:99}));
    return [...extras, ...sources.filter(s=>s.score>0)].sort((a,b)=>b.score-a.score).slice(0,24);
  }
  function cleanText(text, src){
    return String(text||'')
      .replace(/\r\n/g,'\n')
      .replace(/<!--([\s\S]*?)-->/g,'')
      .replace(/<script[\s\S]*?<\/script>/gi,'')
      .replace(/<style[\s\S]*?<\/style>/gi,'')
      .replace(/<[^>]+>/g,' ')
      .replace(/\n{4,}/g,'\n\n')
      .trim()
      .slice(0, 900000);
  }
  function chunks(text, size=1800, overlap=220){
    const out=[]; let i=0, n=0; text=String(text||'');
    while(i<text.length){ const part=text.slice(i,i+size).trim(); if(part) out.push({idx:n++, text:part}); i += size-overlap; }
    return out;
  }
  async function fetchSource(src){
    const started=Date.now();
    const res=await fetch(src.url, {cache:'no-store', mode:'cors'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw=await res.text();
    const text=cleanText(raw, src);
    return { src, text, bytes:new Blob([raw]).size, cleanedBytes:new Blob([text]).size, ms:Date.now()-started, sha:hash(text) };
  }
  async function injectIntoAPKEngine(job, docs){
    const engine=window.GitFusionAPKEngine;
    if(!engine) throw new Error('GitFusionAPKEngine não carregado');
    let importedChunks=0;
    for(const doc of docs){
      const ch=chunks(doc.text).map(c=>({
        id:`chunk_auto_${doc.id}_${c.idx}`, docId:`auto_${doc.id}`, projectId:job.projectId||'autotrainer', source:'autotrainer', path:doc.url, name:doc.title||doc.id, idx:c.idx, text:c.text, weight:2, createdAt:now(), updatedAt:now()
      }));
      const fakeFile = new File([doc.text], `${doc.id}.md`, {type:'text/markdown'});
      Object.defineProperty(fakeFile,'webkitRelativePath',{value:`autotrainer/${doc.id}.md`});
      await engine.importFiles([fakeFile], {projectId:job.projectId||'autotrainer'});
      engine.remember({ text:`AutoTrainer estudou ${doc.title||doc.id}\nURL: ${doc.url}\nChunks: ${ch.length}\nResumo: ${doc.text.slice(0,700)}`, projectId:job.projectId||'autotrainer', tags:['autotrainer','download','dataset',...(doc.tags||[])], source:'autotrainer', weight:5 });
      importedChunks += ch.length;
    }
    engine.addDecision?.(job.projectId||'autotrainer', {title:`AutoTrainer: ${job.topic}`, text:`Fontes estudadas: ${docs.length}; chunks estimados: ${importedChunks}.`, reason:'Usuário autorizou coleta/estudo de fontes para base local.', source:'autotrainer'});
    return { importedDocs:docs.length, importedChunks };
  }
  function buildDataset(job, docs){
    const rows=[];
    for(const d of docs){
      const cs=chunks(d.text,1400,180);
      rows.push({instruction:`Explique o documento ${d.title||d.id} para o GitFusion usar em desenvolvimento.`, input:d.text.slice(0,5000), output:`Fonte ${d.url} importada para a base local. Use estes conceitos ao responder sobre ${job.topic}.`, meta:{source:d.url,tags:d.tags||[],jobId:job.id}});
      for(const c of cs.slice(0,80)) rows.push({instruction:`Use este trecho como conhecimento local sobre ${job.topic}.`, input:c.text, output:`Trecho indexado da fonte ${d.url}.`, meta:{source:d.url,chunk:c.idx,jobId:job.id}});
    }
    return rows.map(r=>JSON.stringify(r)).join('\n')+'\n';
  }
  function downloadText(name, text, type='application/jsonl'){
    const blob=new Blob([text],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  }
  function renderProgress(job){
    const el=q('autoTrainerProgress'); if(!el) return;
    el.classList.remove('hidden');
    el.innerHTML=`<div class="brain-head"><strong>${esc(job.status||'running')}</strong><span>${job.progress||0}%</span></div><div class="brain-progress"><i style="width:${job.progress||0}%"></i></div><p>${esc(job.current||'Processando...')}</p>`;
  }
  async function plan(topic, extraUrls){
    const sources=await plannedSources(topic,extraUrls);
    return { topic, sources, steps:[
      'Validar comando do usuário e escopo permitido',
      'Selecionar fontes de registry + URLs extras',
      'Baixar textos e markdowns acessíveis',
      'Limpar HTML/Markdown e quebrar em chunks',
      'Salvar no MemPalace/RAG local do APK',
      'Gerar dataset JSONL para LoRA futuro',
      'Criar decisão e tarefas de revisão'
    ]};
  }
  async function run(opts={}, onUpdate=()=>{}){
    const topic=opts.topic||'GitFusion desenvolvimento mobile IA';
    const command=opts.command||`Estude ${topic} e atualize a base local.`;
    const extraUrls=opts.extraUrls||'';
    if(!/estud|trein|baix|import|aprend|dataset|docs|document/i.test(command)) throw new Error('Comando precisa autorizar estudo/baixa/importação de fontes.');
    const sources=await plannedSources(topic,extraUrls);
    const job={id:uid('autotrain'), topic, command, status:'running', progress:2, current:'Planejando fontes', sources:sources.map(s=>({id:s.id,url:s.url,tags:s.tags,packId:s.packId})), createdAt:now(), docs:[], errors:[]};
    await putJob(job); onUpdate(job); await sleep(200);
    const docs=[]; let done=0;
    for(const src of sources){
      job.current=`Baixando ${src.id}`; job.progress=Math.min(78, 8+Math.round((done/sources.length)*60)); await putJob(job); onUpdate({...job});
      try{
        const got=await fetchSource(src);
        if(got.text.length<80) throw new Error('conteúdo pequeno demais');
        const doc={id:src.id, title:src.id, url:src.url, tags:src.tags||[], packId:src.packId, text:got.text, bytes:got.bytes, cleanedBytes:got.cleanedBytes, sha:got.sha};
        docs.push(doc); job.docs.push({id:doc.id,url:doc.url,bytes:doc.bytes,cleanedBytes:doc.cleanedBytes,sha:doc.sha});
      }catch(e){ job.errors.push({id:src.id,url:src.url,error:e.message}); }
      done++;
    }
    job.current='Injetando no MemPalace/RAG local'; job.progress=82; await putJob(job); onUpdate({...job});
    const importResult=await injectIntoAPKEngine(job, docs);
    job.current='Gerando dataset JSONL'; job.progress=92; await putJob(job); onUpdate({...job});
    const dataset=buildDataset(job, docs);
    localStorage.setItem('gitfusion.autotrainer.lastDataset', dataset);
    localStorage.setItem('gitfusion.autotrainer.lastDatasetName', `gitfusion-autotrainer-${job.id}.jsonl`);
    job.status='completed'; job.progress=100; job.current='AutoTrainer concluído'; job.result={...importResult, datasetRows:dataset.trim()?dataset.trim().split('\n').length:0, failed:job.errors.length}; job.completedAt=now();
    await putJob(job); onUpdate({...job});
    return job;
  }
  async function render(){
    const status=q('autoTrainerStatus'), results=q('autoTrainerResults');
    if(!status || !results) return;
    const jobs=await listJobs().catch(()=>[]);
    status.textContent = jobs[0] ? `Última execução: ${jobs[0].status} · ${jobs[0].topic}` : 'AutoTrainer aguardando comando.';
    results.innerHTML = jobs.length ? jobs.slice(0,8).map(j=>`<div class="rag-result"><strong>${esc(j.topic)}</strong><small>${esc(j.status)} · ${j.progress||0}% · ${(j.docs||[]).length} fontes · ${(j.errors||[]).length} falhas</small><p>${esc(j.current||j.command||'')}</p></div>`).join('') : '<p class="status">Nenhuma execução ainda.</p>';
  }
  async function wire(){
    q('autoTrainerSeedBtn')?.addEventListener('click', async()=>{
      const sources=await plannedSources(q('autoTrainerTopic')?.value||'gitfusion capacitor termux ai','');
      q('autoTrainerUrls').value=sources.slice(0,8).map(s=>s.url).join('\n');
      q('autoTrainerStatus').textContent=`${sources.length} fontes recomendadas carregadas.`;
    });
    q('autoTrainerPlanBtn')?.addEventListener('click', async()=>{
      const pl=await plan(q('autoTrainerTopic')?.value, q('autoTrainerUrls')?.value);
      q('autoTrainerResults').innerHTML=`<div class="rag-result"><strong>Plano AutoTrainer</strong><small>${pl.sources.length} fontes candidatas</small><p>${pl.steps.map((x,i)=>`${i+1}. ${x}`).join('<br>')}</p><p>${pl.sources.slice(0,10).map(s=>esc(s.id+' · '+s.url)).join('<br>')}</p></div>`;
    });
    q('autoTrainerRunBtn')?.addEventListener('click', async()=>{
      try{
        const topic=q('autoTrainerTopic')?.value||'GitFusion APK IA offline';
        const command=q('autoTrainerCommand')?.value||`Estude ${topic}, baixe docs permitidos e atualize a base local.`;
        const job=await run({topic,command,extraUrls:q('autoTrainerUrls')?.value}, j=>{ q('autoTrainerStatus').textContent=j.current; renderProgress(j); });
        q('autoTrainerStatus').textContent=`Concluído: ${job.result.importedDocs} docs, ${job.result.datasetRows} linhas de dataset.`;
        await render();
      }catch(e){ q('autoTrainerStatus').textContent='Erro: '+e.message; }
    });
    q('autoTrainerDatasetBtn')?.addEventListener('click', ()=>{
      const ds=localStorage.getItem('gitfusion.autotrainer.lastDataset')||'';
      if(!ds){ q('autoTrainerStatus').textContent='Nenhum dataset gerado ainda.'; return; }
      downloadText(localStorage.getItem('gitfusion.autotrainer.lastDatasetName')||'gitfusion-autotrainer.jsonl', ds);
    });
  }
  async function maybeHandleChatCommand(prompt, ctx={}){
    if(!/\b(estud|trein|autotrain|baixe docs|baixar docs|aprenda|crie dataset|gerar dataset)\b/i.test(String(prompt||''))) return null;
    const topic=String(prompt).replace(/^(gitfusion|chat|por favor|quero que você)/i,'').slice(0,180) || 'GitFusion desenvolvimento';
    const job=await run({topic, command:String(prompt), extraUrls:''}, ctx.onUpdate||(()=>{}));
    return { text:`AutoTrainer concluído. Fontes importadas: ${job.result.importedDocs}. Chunks estimados: ${job.result.importedChunks}. Dataset: ${job.result.datasetRows} linhas. Falhas: ${job.result.failed}. Agora a base local/RAG foi alimentada para responder melhor offline.`, job };
  }
  window.GitFusionAutoTrainer={plan,run,render,wire,maybeHandleChatCommand,listJobs,loadRegistry,plannedSources};
  window.addEventListener('load',()=>{ wire(); render(); });
})();
