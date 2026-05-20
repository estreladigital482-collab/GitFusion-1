/* GitFusion 16.5 AI Pack Installer
   - downloads/registers large GGUF model packs
   - supports Ollama pull references
   - stores install state in IndexedDB/localStorage
   - designed for APK-first + Termux build flow
*/
(function(){
  const DB_NAME='gitfusion-ai-packs-v16-5';
  const DB_VERSION=1;
  const STATE_KEY='gitfusion.aiPacks.state.v16.5';
  const REGISTRY='/ai-pack-registry.json';
  const now=()=>new Date().toISOString();
  const fmtBytes=(b)=>{ b=Number(b||0); if(b>1024**3) return `${(b/1024**3).toFixed(2)} GB`; if(b>1024**2) return `${(b/1024**2).toFixed(1)} MB`; if(b>1024) return `${(b/1024).toFixed(1)} KB`; return `${b} B`; };
  const read=(k,f)=>{ try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch{return f;} };
  const write=(k,v)=>{ localStorage.setItem(k,JSON.stringify(v)); return v; };
  function state(){ return {installed:{},downloads:{},activeModel:null,updatedAt:null,...read(STATE_KEY,{})}; }
  function save(p){ return write(STATE_KEY,{...state(),...p,updatedAt:now()}); }
  function openDb(){ return new Promise((resolve,reject)=>{ const req=indexedDB.open(DB_NAME,DB_VERSION); req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains('models')) db.createObjectStore('models',{keyPath:'id'}); if(!db.objectStoreNames.contains('chunks')){ const chunks=db.createObjectStore('chunks',{keyPath:'id'}); chunks.createIndex('modelId','modelId',{unique:false}); } if(!db.objectStoreNames.contains('logs')) db.createObjectStore('logs',{keyPath:'id'}); }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
  function reqp(r){ return new Promise((resolve,reject)=>{ r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); }); }
  async function put(store,item){ const db=await openDb(); await new Promise((resolve,reject)=>{ const tx=db.transaction(store,'readwrite'); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.objectStore(store).put(item); }); db.close(); }
  async function all(store){ const db=await openDb(); const out=await reqp(db.transaction(store).objectStore(store).getAll()); db.close(); return out||[]; }
  async function registry(){ const res=await fetch(REGISTRY,{cache:'no-store'}); if(!res.ok) throw new Error(`Registry IA indisponível: HTTP ${res.status}`); return res.json(); }
  async function installedModels(){ const dbModels=await all('models').catch(()=>[]); const st=state(); return dbModels.map(m=>({...m, ...(st.installed?.[m.id]||{})})); }
  async function registerModel(meta, patch={}){ const item={...meta, ...patch, installedAt:now(), localStatus:patch.localStatus||'registered'}; await put('models',item); const st=state(); st.installed[item.id]={id:item.id,name:item.name,filename:item.filename,sizeBytes:item.sizeBytes,localStatus:item.localStatus,installedAt:item.installedAt,source:item.source||'registered'}; if(!st.activeModel) st.activeModel=item.id; save(st); return item; }
  async function downloadModel(meta,onProgress=()=>{}){
    if(!meta?.hfUrl) throw new Error('Modelo sem URL de download.');
    const id=meta.id; const st=state(); st.downloads[id]={status:'downloading',received:0,total:meta.sizeBytes||0,startedAt:now()}; save(st);
    const res=await fetch(meta.hfUrl);
    if(!res.ok) throw new Error(`Falha ao baixar ${meta.name}: HTTP ${res.status}`);
    const total=Number(res.headers.get('content-length')||meta.sizeBytes||0);
    const reader=res.body?.getReader?.();
    if(!reader){ const blob=await res.blob(); await registerModel(meta,{blob,source:'hf-blob',localStatus:'downloaded',actualBytes:blob.size}); onProgress({id,percent:100,received:blob.size,total:blob.size}); return; }
    const parts=[]; let received=0; let last=0;
    while(true){ const {done,value}=await reader.read(); if(done) break; parts.push(value); received += value.byteLength; const pct=total?Math.round(received/total*100):0; if(pct!==last){ last=pct; const s=state(); s.downloads[id]={status:'downloading',received,total,percent:pct,updatedAt:now()}; save(s); onProgress({id,percent:pct,received,total,current:`Baixando ${meta.name}: ${fmtBytes(received)} / ${fmtBytes(total)}`}); } }
    const blob=new Blob(parts,{type:'application/octet-stream'});
    await registerModel(meta,{blob,source:'hf-blob',localStatus:'downloaded',actualBytes:blob.size});
    const s=state(); s.downloads[id]={status:'done',received:blob.size,total:blob.size,percent:100,updatedAt:now()}; save(s);
    onProgress({id,percent:100,received:blob.size,total:blob.size,current:`${meta.name} baixado`});
  }
  async function installAll(onProgress=()=>{}){ const reg=await registry(); const models=reg.models||[]; let i=0; for(const m of models){ const base=Math.round((i/models.length)*100); onProgress({percent:base,current:`Preparando ${m.name}`}); try{ await downloadModel(m,p=>onProgress({...p,percent:base+Math.round((p.percent||0)/models.length)})); }catch(e){ await registerModel(m,{source:'remote-manifest',localStatus:'download-failed',error:e.message}); onProgress({percent:base,current:`Falhou ${m.name}: ${e.message}`,error:true}); } i++; } onProgress({percent:100,current:'Pacotes de IA processados'}); return installedModels(); }
  async function ollamaPullCommands(){ const reg=await registry(); return (reg.models||[]).map(m=>`ollama run ${m.ollamaRef}`).join('\n'); }
  async function termuxDownloadCommands(){ const reg=await registry(); return (reg.models||[]).map(m=>`curl -L -o "$HOME/GitFusion/models/${m.filename}" "${m.hfUrl}"`).join('\n'); }
  async function status(){ const reg=await registry().catch(e=>({error:e.message,models:[]})); const installed=await installedModels(); const st=state(); const totalBytes=(reg.models||[]).reduce((a,m)=>a+Number(m.sizeBytes||0),0); const downloaded=installed.filter(m=>m.localStatus==='downloaded').reduce((a,m)=>a+Number(m.actualBytes||m.sizeBytes||0),0); return {registry:reg, installed, activeModel:st.activeModel, totalBytes, downloadedBytes:downloaded, ready:installed.some(m=>m.localStatus==='downloaded') || installed.some(m=>m.localStatus==='registered'), updatedAt:now()}; }
  function render(container){ if(!container) return; status().then(st=>{ const models=st.registry.models||[]; container.innerHTML=`<div class="ai-pack-summary"><strong>Pacotes IA</strong><small>${fmtBytes(st.downloadedBytes)} baixados / ${fmtBytes(st.totalBytes)} planejados</small></div>` + models.map(m=>{ const inst=st.installed.find(x=>x.id===m.id); return `<div class="ai-pack-card" data-model-id="${m.id}"><b>${m.name}</b><small>${m.role}</small><span>${fmtBytes(m.sizeBytes)} · ${inst?.localStatus||'não instalado'}</span><div class="row tight-row"><button class="ghost ai-pack-register" data-id="${m.id}" type="button">Registrar</button><button class="primary ai-pack-download" data-id="${m.id}" type="button">Baixar no APK</button></div></div>`; }).join('') + `<div class="form-card slim"><button id="aiPackInstallAll" class="primary" type="button">Baixar todos os pacotes</button><button id="aiPackOllamaCmds" class="ghost" type="button">Comandos Ollama</button><button id="aiPackTermuxCmds" class="ghost" type="button">Comandos Termux</button><textarea id="aiPackCommands" class="big-textarea" readonly placeholder="Comandos aparecerão aqui..."></textarea></div>`; container.querySelectorAll('.ai-pack-register').forEach(btn=>btn.onclick=async()=>{ const meta=models.find(m=>m.id===btn.dataset.id); await registerModel(meta,{source:'manual-register',localStatus:'registered'}); render(container); }); container.querySelectorAll('.ai-pack-download').forEach(btn=>btn.onclick=async()=>{ const meta=models.find(m=>m.id===btn.dataset.id); const statusBox=document.getElementById('aiPacksStatus'); await downloadModel(meta,p=>{ if(statusBox) statusBox.textContent=p.current||`${p.percent||0}%`; }); render(container); }); const allBtn=container.querySelector('#aiPackInstallAll'); if(allBtn) allBtn.onclick=()=>installAll(p=>{ const statusBox=document.getElementById('aiPacksStatus'); if(statusBox) statusBox.textContent=p.current||`${p.percent||0}%`; }).then(()=>render(container)); const oll=container.querySelector('#aiPackOllamaCmds'); if(oll) oll.onclick=async()=>{ container.querySelector('#aiPackCommands').value=await ollamaPullCommands(); }; const trm=container.querySelector('#aiPackTermuxCmds'); if(trm) trm.onclick=async()=>{ container.querySelector('#aiPackCommands').value='mkdir -p "$HOME/GitFusion/models"\n'+await termuxDownloadCommands(); }; }).catch(e=>{ container.innerHTML=`<p class="status danger-text">${e.message}</p>`; }); }
  window.GitFusionAIPacks={registry,status,installedModels,registerModel,downloadModel,installAll,ollamaPullCommands,termuxDownloadCommands,render,fmtBytes};
})();
