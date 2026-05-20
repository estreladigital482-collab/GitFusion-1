const API_BASE = window.GITFUSION_API_BASE || '';
const $ = (id)=>document.getElementById(id);
const state = { repos: [], chats: [], activeChatId: 'main', activePage: 'workspace', jobId: null, downloadUrl: null, projects: [], attachments: [], theme: localStorage.getItem('gitfusion.theme') || 'chatgpt', wiki: { projectId: '', pages: [], activeSlug: '' }, learning: { sources: [], activeId: '', activePath: '' }, activeProjectId: '', activeFilePath: '', activeProjectFolderId: '', projectFolders: [], tasks: [], brainRuns: [], workspaceIde: { activePath: '' }, onboarded: localStorage.getItem('gitfusion.onboarded') === 'true' };
function esc(s){ return String(s ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2600); }
function save(){ localStorage.setItem('gitfusion.v15', JSON.stringify({repos:state.repos,chats:state.chats,activeChatId:state.activeChatId,jobId:state.jobId,downloadUrl:state.downloadUrl,projectFolders:state.projectFolders,tasks:state.tasks,brainRuns:state.brainRuns,workspaceIde:state.workspaceIde,onboarded:state.onboarded,activeProjectId:state.activeProjectId,activeFilePath:state.activeFilePath,activeProjectFolderId:state.activeProjectFolderId,theme:state.theme,wiki:state.wiki,learning:state.learning})); }
function load(){
  try{ Object.assign(state, JSON.parse(localStorage.getItem('gitfusion.v15') || '{}')); }catch{}
  if(!Array.isArray(state.chats)) state.chats=[];
  if(!Array.isArray(state.projectFolders)) state.projectFolders=[];
  // Session 14.15: the sidebar starts clean like ChatGPT. No forced project/recent item.
  // A project only appears after the user creates/generates one.
  if(!state.chats.length){
    state.chats=[{id:'main',title:'Chat',projectId:null,sidebarHidden:true,messages:[{role:'ai',text:'Cole os links dos repositórios aqui embaixo. Quando você pedir para gerar, eu crio um projeto e separo os chats dele na sidebar.'}]}];
    state.activeChatId='main';
  }
  state.projectFolders=(state.projectFolders||[]).filter(f=>f && f.id && f.id!=='default');
  for(const c of state.chats){ if(c.projectId==='default') c.projectId=null; }
  if(!Array.isArray(state.tasks)) state.tasks=[];
  if(!Array.isArray(state.brainRuns)) state.brainRuns=[];
} 
function token(){ return localStorage.getItem('gitfusion.githubToken') || $('githubToken')?.value?.trim() || ''; }

function initials(name){ return String(name||'Toby Santos').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || 'GF'; }
function profile(){ return {name: localStorage.getItem('gitfusion.profileName') || 'Usuário', photo: localStorage.getItem('gitfusion.profilePhoto') || ''}; }
function setAvatarEl(el, prof){ if(!el) return; if(prof.photo){ el.innerHTML=`<img src="${prof.photo}" alt="perfil">`; } else { el.textContent=initials(prof.name); } }
function renderProfile(){ const prof=profile(); setAvatarEl($('profileAvatar'), prof); setAvatarEl($('profilePhotoPreview'), prof); setAvatarEl($('profileBtn'), prof); const nameTitle=$('profileNameTitle'); if(nameTitle) nameTitle.textContent=prof.name; const input=$('profileNameInput'); if(input) input.value=prof.name; }

function applyThemeNow(){
  document.body.dataset.theme = state.theme || localStorage.getItem('gitfusion.theme') || 'chatgpt';
}
function showOnboarding(){
  if(localStorage.getItem('gitfusion.onboarded') === 'true') return;
  const wrap=document.createElement('div');
  wrap.id='onboardingModal';
  wrap.className='onboarding-modal';
  wrap.innerHTML=`<div class="onboarding-card">
    <img src="/assets/mascot-inner-clean.png" alt="GitFusion">
    <h1>Configurar GitFusion</h1>
    <p>Antes de usar, escolha seu nome e o tema inicial. Você pode mudar tudo depois nas configurações.</p>
    <label>Seu nome</label>
    <input id="onboardName" placeholder="Ex: Toby" value="${esc(localStorage.getItem('gitfusion.profileName')||'')}">
    <label>Tema</label>
    <div class="onboard-themes">
      <button data-onboard-theme="chatgpt" class="active">Escuro clean</button>
      <button data-onboard-theme="cyberpunk">Cyberpunk</button>
      <button data-onboard-theme="purple">Roxo</button>
    </div>
    <button id="finishOnboarding" class="primary onboard-start">Entrar no GitFusion</button>
    <small>O APK possui MemPalace/RAG local. Para LLM offline avançado, configure Ollama local ou modelo embarcado quando disponível.</small>
  </div>`;
  document.body.appendChild(wrap);
  let chosen=state.theme || 'chatgpt';
  wrap.querySelectorAll('[data-onboard-theme]').forEach(b=>b.onclick=()=>{ chosen=b.dataset.onboardTheme; wrap.querySelectorAll('[data-onboard-theme]').forEach(x=>x.classList.toggle('active',x===b)); });
  wrap.querySelector('#finishOnboarding').onclick=()=>{
    const name=wrap.querySelector('#onboardName').value.trim() || 'Usuário';
    localStorage.setItem('gitfusion.profileName', name);
    localStorage.setItem('gitfusion.theme', chosen);
    localStorage.setItem('gitfusion.onboarded','true');
    state.onboarded=true; state.theme=chosen; applyThemeNow(); renderProfile(); wrap.remove(); toast('Perfil configurado.');
  };
}
async function cycleConnectivityMode(){
  const current=(await api('/api/connectivity/mode').catch(()=>({mode:currentRuntimeMode()}))).mode || currentRuntimeMode();
  const next=current==='auto'?'online':current==='online'?'offline':'auto';
  await setConnectivityMode(next);
}


function currentRuntimeMode(){
  return localStorage.getItem('gitfusion.apkRuntime') || localStorage.getItem('gitfusion.connectivityMode') || 'auto';
}
function normalizeModeLabel(mode){ return mode==='online'?'Online':mode==='offline'?'Offline':mode==='ollama'?'Ollama':mode==='embedded'?'Embedded':'Auto'; }
async function runApkBrainFallback(prompt, pending, attachments=[]){
  if(!window.GitFusionAPKEngine) throw new Error('Motor APK não carregado.');
  const c=chat();
  const run = await window.GitFusionAPKEngine.runChat({
    prompt,
    chats: state.chats,
    projectId: c?.projectId || state.activeProjectFolderId || 'general',
    mode: currentRuntimeMode(),
    onUpdate:(r)=>{
      pending.text = r.status==='completed' ? (r.answer || 'Concluído.') : (r.current || 'Processando no APK...');
      pending.brain = {
        ...r,
        perception:{ intent:r.intent || 'chat' },
        stepProgress:{ current:r.current },
        safety:{ mode:r.mode || currentRuntimeMode() },
        plan:r.steps || [],
        progress:r.progress || 0,
        estimateMinutes:r.estimateMinutes || 1,
        provider:r.provider || 'apk-symbolic',
        model:r.model || 'mempalace-rag-rules',
        tasks:(r.steps||[]).filter(x=>x.status==='done')
      };
      save(); renderChats();
    }
  });
  pending.text = run.answer || pending.text;
  pending.brain = { ...(pending.brain||{}), ...run, perception:{intent:run.intent}, stepProgress:{current:run.current}, safety:{mode:run.mode}, plan:run.steps||[], tasks:(run.steps||[]).filter(x=>x.status==='done') };
  state.brainRuns=[{id:run.id,intent:run.intent,progress:run.progress,estimateMinutes:run.estimateMinutes,createdAt:run.createdAt,provider:run.provider}, ...(state.brainRuns||[])].slice(0,20);
  save(); renderChats(); renderTasksPanel();
  return run;
}

function headers(){ const h={'Content-Type':'application/json'}; const tok=token(); if(tok) h.Authorization=`Bearer ${tok}`; return h; }
async function api(path,opt={}){ const res=await fetch(API_BASE+path,{...opt,headers:{...headers(),...(opt.headers||{})}}); const data=await res.json().catch(()=>({})); if(!res.ok) throw new Error(data.error||`HTTP ${res.status}`); return data; }
function chat(){ return state.chats.find(c=>c.id===state.activeChatId) || state.chats[0]; }
function go(page){ state.activePage=page; document.body.className = document.body.className.split(' ').filter(c=>!c.startsWith('page-')).join(' '); document.body.classList.add('page-'+page); document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active', p.id===page)); document.querySelectorAll('.side-item').forEach(b=>b.classList.toggle('active', b.dataset.go===page)); const titles={workspace:'GitFusion',library:'Mesclados',tasks:'Tasks',publish:'Publicar',settings:'Perfil',personalization:'Personalização',memory:'Memória',workspaceSettings:'Espaço',themes:'Temas',wiki:'Wiki',learning:'Aprendizado',rag:'Busca local',connectivity:'Online / Offline',aiPacks:'Pacotes IA',autoTrainer:'AutoTrainer',projectPage:'Projeto',workspaceIde:'Workspace'}; $('titleBtn').textContent = titles[page] || chat().title; document.body.classList.remove('nav-open'); if(page==='memory') loadMemorySafe(); if(page==='library') loadProjects(); if(page==='publish') loadPublishPanel(); if(page==='workspaceSettings') loadWorkspacePanel(); if(page==='personalization') renderProfile(); if(page==='connectivity') loadConnectivityMode(); if(page==='wiki') loadWikiPanel(); if(page==='rag') loadRagPanel(); if(page==='learning') loadLearningPanel(); if(page==='tasks') renderTasksPanel(); if(page==='workspaceIde') loadWorkspaceIde(); if(page==='aiPacks') setTimeout(()=>window.GitFusionAIPacks?.render?.(document.getElementById('aiPacksList')),50); if(page==='autoTrainer') setTimeout(()=>window.GitFusionAutoTrainer?.render?.(),50); }
function parseRepoUrl(line){ try{ const u=new URL(line.trim()); const parts=u.pathname.replace(/^\//,'').replace(/\.git$/,'').split('/'); if(u.hostname.includes('github.com') && parts.length>=2) return {url:`https://github.com/${parts[0]}/${parts[1]}`,owner:parts[0],repo:parts[1]}; }catch{} return null; }
function extractRepos(text){ return text.split(/\s+/).map(x=>x.trim()).filter(Boolean).map(parseRepoUrl).filter(Boolean); }
function addReposFromText(text){ const repos=extractRepos(text); let added=0; for(const r of repos){ if(!state.repos.some(x=>x.url===r.url)){ state.repos.push(r); added++; } } renderRepos(); save(); return added; }
function removeRepo(i){ state.repos.splice(i,1); renderRepos(); save(); }
function renderRepos(){ const box=$('repoChips'); if(!state.repos.length){ box.innerHTML=''; return; } box.innerHTML=state.repos.map((r,i)=>`<span class="chip"><b>${esc(r.repo)}</b><small>${esc(r.owner)}</small><button data-rmrepo="${i}">×</button></span>`).join(''); }
function ensureProjectFolders(){
  if(!Array.isArray(state.projectFolders)) state.projectFolders=[];
  state.projectFolders=state.projectFolders.filter(f=>f && f.id && f.id!=='default');
  for(const f of state.projectFolders){ if(!Array.isArray(f.chats)) f.chats=[]; }
  for(const c of (state.chats||[])){
    if(c.projectId==='default') c.projectId=null;
    if(!c.projectId) continue;
    const f=state.projectFolders.find(x=>x.id===c.projectId);
    if(f && !f.chats.includes(c.id)) f.chats.unshift(c.id);
  }
}
function renderChats(){
  ensureProjectFolders();
  const list=$('chatList'); if(!list) return;
  const folders=[...state.projectFolders].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const folderChatIds=new Set(folders.flatMap(f=>f.chats||[]));
  const looseChats=(state.chats||[]).filter(c=>!c.archived && !c.sidebarHidden && !c.projectId && !folderChatIds.has(c.id));
  const chatDeleteButton = (id)=>`<button class="row-delete delete-one" data-delete-chat="${esc(id)}" title="Excluir chat" aria-label="Excluir chat"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/></svg></button>`;
  const projectDeleteButton = (id)=>`<button class="row-delete delete-folder" data-delete-folder="${esc(id)}" title="Excluir projeto" aria-label="Excluir projeto"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/></svg></button>`;
  const folderHtml=folders.length?`<div class="section-title projects-title">Projetos</div>` + folders.map(f=>{
    const active = state.activeProjectFolderId===f.id || (chat()?.projectId===f.id && state.activePage==='chat');
    return `<div class="project-folder-row ${active?'active':''}" data-folder="${esc(f.id)}">
      <div class="project-folder-head">
        <button class="project-folder-main" data-open-project-folder="${esc(f.id)}" type="button" aria-label="Abrir projeto ${esc(f.title)}"><svg viewBox="0 0 24 24"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/></svg><strong>${esc(f.title)}</strong></button>
        ${projectDeleteButton(f.id)}
      </div>
    </div>`;
  }).join(''):'<div class="section-title projects-title">Projetos</div><div class="sidebar-empty">Nenhum projeto</div>';
  const recentHtml=`<div class="section-title recents-title">Recentes</div>` + (looseChats.length
    ? looseChats.map(c=>`<div class="chat-row-wrap recent-row"><button class="chat-row ${c.id===state.activeChatId?'active':''} ${c.pinned?'pinned':''}" data-chat="${c.id}" type="button"><span>${esc(c.title)}</span></button>${chatDeleteButton(c.id)}</div>`).join('')
    : `<div class="sidebar-empty">Sem recentes</div>`);
  list.innerHTML=folderHtml + recentHtml;
  renderMessages(); updateMoreMenuTitle(); renderProjectPage();
}
function openProjectFolderPage(id){
  const f=(state.projectFolders||[]).find(x=>x.id===id);
  if(!f) return toast('Projeto não encontrado.');
  state.activeProjectFolderId=id;
  save();
  renderProjectPage();
  renderChats();
  go('projectPage');
}
function renderProjectPage(){
  const box=$('projectPageContent'); if(!box) return;
  ensureProjectFolders();
  const f=(state.projectFolders||[]).find(x=>x.id===state.activeProjectFolderId) || (state.projectFolders||[])[0];
  if(!f){ box.innerHTML='<div class="project-mobile-empty"><h2>Nenhum projeto</h2><p>Crie um projeto para organizar seus chats.</p></div>'; return; }
  const chats=(f.chats||[]).map(id=>state.chats.find(c=>c.id===id)).filter(c=>c && !c.archived);
  box.innerHTML=`<div class="project-mobile-shell">
    <div class="project-mobile-title"><svg viewBox="0 0 24 24"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/></svg><h1>${esc(f.title)}</h1></div>
    <button class="project-sources-pill" data-go="learning" type="button">Fontes</button>
    <div class="project-chat-list">${chats.length?chats.map(c=>`<button class="project-chat-card" data-chat="${esc(c.id)}" type="button"><strong>${esc(c.title)}</strong><span>${esc((c.messages||[]).slice(-1)[0]?.text || 'Novo chat')}</span></button>`).join(''):'<p class="project-empty-note">Nenhum chat neste projeto ainda.</p>'}</div>
  </div>`;
}
function brainBar(percent){ const p=Math.max(0,Math.min(100,Number(percent||0))); return `<div class="brain-progress-track"><span style="width:${p}%"></span></div>`; }
function formatBrainCard(run){
  if(!run) return '';
  const plan=Array.isArray(run.plan)?run.plan:(Array.isArray(run.steps)?run.steps:[]);
  const percent=Number(run.progress ?? 0);
  const current=run.stepProgress?.current || run.current || plan.find(x=>x.status!=='done')?.title || 'Processando';
  const tasks=Array.isArray(run.tasks)?run.tasks.length:plan.length;
  const real=run.execution?.real;
  const realOk=real? real.results?.filter(r=>r.ok).length || 0 : 0;
  const realFail=real? real.results?.filter(r=>!r.ok).length || 0 : 0;
  const realLine=real?`<span>Ações reais: ${realOk}/${real.count}${realFail?` · ${realFail} falhou`:''}</span>`:'';
  const steps=plan.slice(0,8).map(s=>`<li class="${s.status==='done'?'done':s.status==='running'?'running':'planned'}"><span>${esc(s.index||'')}</span><strong>${esc(s.title||'Etapa')}</strong><small>${esc(s.estimateMinutes||1)}min</small></li>`).join('');
  return `<div class="brain-card">
    <div class="brain-card-head"><span class="brain-orb">🧠</span><div><strong>GitFusion Brain</strong><small>${esc(run.perception?.intent || run.intent || 'motor real')}</small></div></div>
    <div class="brain-meta"><span>${percent}%</span><span>${esc(run.estimateMinutes || 1)} min estimado</span><span>${esc(run.safety?.mode || run.mode || 'auto')}</span></div>
    ${brainBar(percent)}
    <div class="brain-current">${esc(current)}</div>
    ${steps?`<ol class="brain-steps">${steps}</ol>`:''}
    <div class="brain-foot"><span>Etapas: ${tasks}</span>${realLine}<span>Motor: ${esc((run.provider||'pendente')+'/'+(run.model||'nenhum'))}</span></div>
  </div>`;
}
function renderMessageBody(m){
  const text=`<div class="msg-text">${esc(m.text)}</div>`;
  if(m.brain) return `${formatBrainCard(m.brain)}${m.text?text:''}`;
  return text;
}
function renderMessages(){ const c=chat(); $('messages').innerHTML=(c.messages||[]).map(m=>`<div class="msg ${m.role} ${m.brain?'brain-msg':''}"><div class="avatar ${m.role==='user'?'user':''}">${m.role==='user'?initials(profile().name):'<img src="/assets/mascot-inner-clean.png" alt="">'}</div><div class="msg-body">${renderMessageBody(m)}</div></div>`).join(''); $('messages').scrollTop=$('messages').scrollHeight; if(state.activePage==='chat') $('titleBtn').textContent=c.title; }
function createProjectChat(title){
  ensureProjectFolders();
  let folderId=state.activeProjectFolderId;
  if(!folderId || !state.projectFolders.some(f=>f.id===folderId)){
    const idFolder='project_'+Date.now();
    state.projectFolders.unshift({id:idFolder,title:title || 'Novo projeto',open:true,chats:[],createdAt:Date.now()});
    folderId=idFolder;
    state.activeProjectFolderId=folderId;
  }
  const id='chat_'+Date.now();
  state.chats.unshift({id,title:title || 'Chat do projeto',projectId:folderId,messages:[{role:'ai',text:'Projeto iniciado. Vou analisar os repositórios, montar a fusão, gerar o pacote e deixar pronto para publicar.'}]});
  const f=state.projectFolders.find(x=>x.id===folderId);
  if(f){ f.open=true; f.chats=[id,...(f.chats||[]).filter(x=>x!==id)]; }
  state.activeChatId=id; save(); renderChats(); go('chat'); return chat();
}
function deleteChat(id){ if(state.chats.length<=1){ state.chats[0].messages=[]; return renderChats(); } state.chats=state.chats.filter(c=>c.id!==id); if(state.activeChatId===id) state.activeChatId=state.chats[0]?.id || 'main'; save(); renderChats(); }
function newChat(){
  const id='chat_'+Date.now();
  const folderId=state.activeProjectFolderId && state.projectFolders.some(f=>f.id===state.activeProjectFolderId) ? state.activeProjectFolderId : null;
  state.chats.unshift({id,title:'Novo chat',projectId:folderId,messages:[{role:'ai',text:'Novo chat criado. Cole links, peça uma análise ou continue o projeto.'}]});
  if(folderId){ ensureProjectFolders(); const f=state.projectFolders.find(x=>x.id===folderId); if(f){ f.open=true; f.chats=[id,...(f.chats||[]).filter(x=>x!==id)]; } state.activeProjectFolderId=null; }
  state.activeChatId=id; save(); renderChats(); go('chat');
}
function updateMoreMenuTitle(){ const el=$('moreMenuTitle'); if(el) el.textContent = chat()?.title || 'Novo projeto'; }
async function shareCurrentChat(){ const title=chat()?.title || 'GitFusion'; const text=`${title} · GitFusion`; const url=location.href; try{ if(navigator.share) await navigator.share({title,text,url}); else { await navigator.clipboard.writeText(url); toast('Link copiado.'); } }catch{ toast('Compartilhamento cancelado.'); } }
function togglePinChat(){ const c=chat(); c.pinned=!c.pinned; save(); renderChats(); toast(c.pinned?'Chat fixado.':'Chat desafixado.'); }
function archiveCurrentChat(){ const c=chat(); c.archived=true; if(state.chats.filter(x=>!x.archived).length===0){ state.chats.unshift({id:'main_'+Date.now(),title:'Novo projeto',messages:[]}); } state.activeChatId=state.chats.find(x=>!x.archived)?.id || state.chats[0].id; save(); renderChats(); go('workspace'); toast('Chat arquivado.'); }
function addCurrentToHome(){ localStorage.setItem('gitfusion.homeChat', state.activeChatId); toast('Adicionado ao início.'); }
function addCurrentToProject(){ go('library'); toast('Escolha um projeto mesclado para vincular este chat.'); }
function showUploadedFiles(){ $('filePicker')?.click(); toast('Selecione arquivos para anexar ao chat.'); }
function addPeople(){ toast('Convites serão conectados ao módulo de colaboração.'); }
function autoGrow(){ const el=$('mainInput'); el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,150)+'px'; }
function renderAttachments(){ const box=$('attachmentPreview'); if(!state.attachments.length){ box.classList.add('hidden'); box.innerHTML=''; return; } box.classList.remove('hidden'); box.innerHTML=state.attachments.map((f,i)=>`<span class="file-pill"><svg viewBox="0 0 24 24"><path d="M14 2H6v20h12V8zM14 2v6h6"/></svg>${esc(f.name)} <button data-rmfile="${i}">×</button></span>`).join(''); }
function addMsg(role,text,extra={}){ const c=chat(); c.messages.push({role,text,...extra}); save(); renderChats(); }
async function pollBrainRun(runId, messageRef, maxMs=120000){
  const started=Date.now();
  let lastPercent=-1;
  while(Date.now()-started < maxMs){
    const data=await api(`/api/brain/chat/${encodeURIComponent(runId)}`);
    if(messageRef){
      messageRef.text = data.status === 'completed' ? (data.answer || 'Concluído.') : (data.current || 'Processando...');
      messageRef.brain = {
        ...data,
        perception:{ intent:data.intent || 'chat' },
        stepProgress:{ current:data.current },
        safety:{ mode:data.mode || 'auto' },
        plan:data.steps || [],
        progress:data.progress || 0,
        estimateMinutes:data.estimateMinutes || 1,
        provider:data.provider,
        model:data.model,
        tasks:(data.steps||[]).filter(x=>x.status==='done')
      };
      if((data.progress||0)!==lastPercent){ lastPercent=data.progress||0; save(); renderChats(); }
    }
    if(data.status==='completed' || data.status==='failed'){
      if(data.status==='failed') messageRef.text='Falha no motor real: '+(data.error||'erro desconhecido');
      save(); renderChats(); return data;
    }
    await new Promise(r=>setTimeout(r, 700));
  }
  throw new Error('Tempo limite aguardando resposta do motor real.');
}

async function sendText(){
  const text=$('mainInput').value.trim();
  if(!text && !state.attachments.length) return;
  $('mainInput').value=''; autoGrow();
  const added=addReposFromText(text);
  if(state.activePage==='workspace' && added && !/analisa|analisar|chat|ia|cria|criar|gera|gerar|corrige|erro|junta|mescla/i.test(text)){
    toast(`${added} repositório(s) adicionado(s).`); state.attachments=[]; renderAttachments(); return;
  }
  if(state.activePage!=='chat'){ createProjectChat('Conversa do projeto'); }
  const attachmentText = state.attachments.length ? `Anexo(s): ${state.attachments.map(f=>f.name).join(', ')}` : '';
  const prompt=text || attachmentText;
  addMsg('user', prompt);
  const attachments=[...state.attachments];
  state.attachments=[]; renderAttachments();
  const c=chat();
  const pending={role:'ai', text:'Iniciando motor real do GitFusion...', brain:{progress:3, estimateMinutes:1, perception:{intent:'iniciando'}, stepProgress:{current:'Abrindo execução real no backend'}, safety:{mode:'auto'}, plan:[]}};
  c.messages.push(pending); save(); renderChats();
  try{
    const start=await api('/api/brain/chat/start',{method:'POST',body:JSON.stringify({
      prompt,
      repos:state.repos,
      attachments,
      chatId:state.activeChatId,
      projectId:c?.projectId || state.activeProjectFolderId || 'general',
      source:'mobile-chat-real'
    })});
    pending.brain={...pending.brain,...start,perception:{intent:start.intent||'chat'},stepProgress:{current:start.current},safety:{mode:start.mode||'auto'},plan:start.steps||[]};
    pending.text=start.current || 'Motor real iniciado.'; save(); renderChats();
    const done=await pollBrainRun(start.id, pending);
    if(done?.id){
      state.brainRuns=[{id:done.id,intent:done.intent,progress:done.progress,estimateMinutes:done.estimateMinutes,createdAt:done.createdAt}, ...(state.brainRuns||[])].slice(0,20);
    }
    save(); renderChats(); renderTasksPanel();
  }catch(e){
    try{
      pending.text='Servidor não disponível. Assumindo motor APK-first local...';
      pending.brain={...(pending.brain||{}),progress:12, perception:{intent:'apk-first'}, stepProgress:{current:'Ativando MemPalace/RAG do APK'}, safety:{mode:currentRuntimeMode()}, plan:[]};
      save(); renderChats();
      await runApkBrainFallback(prompt, pending, attachments);
    }catch(localError){
      pending.text='Não consegui usar nenhum motor agora: '+localError.message+'\n\nEstado real: servidor Termux/API indisponível e motor APK local não carregou.';
      pending.brain={progress:0, perception:{intent:'erro'}, stepProgress:{current:'Falha ao conectar motores'}, safety:{mode:'bloqueado'}, plan:[]};
      save(); renderChats();
    }
  }
}
async function analyze(){ if(state.repos.length<2) throw new Error('Adicione pelo menos 2 repositórios.'); const data=await api('/api/analyze',{method:'POST',body:JSON.stringify({repos:state.repos.map(r=>r.url)})}); state.jobId=data.jobId; state.repos=data.repos.map(r=>({url:r.html,owner:r.owner,repo:r.repo,fileCount:r.fileCount,stack:r.stack})); save(); renderRepos(); return data; }
async function fuse(){ if(!state.jobId) await analyze(); const defaultName = state.repos.map(r=>r.repo).slice(0,2).join('-') || 'gitfusion-project'; const projectName = ($('publishName').value || defaultName).replace(/[^a-zA-Z0-9._-]/g,'-'); const data=await api('/api/fuse',{method:'POST',body:JSON.stringify({jobId:state.jobId,projectName,baseIndex:0})}); state.downloadUrl=data.downloadUrl; save(); await loadProjects(); return data; }
async function startFusion(){ if(state.repos.length<2) return toast('Cole pelo menos 2 links de repositórios.'); const c=createProjectChat(state.repos.map(r=>r.repo).slice(0,2).join(' + ')); renderMessages(); try{ addMsg('ai','Analisando repositórios reais...'); const a=await analyze(); addMsg('ai',`Análise concluída. Repositórios detectados:\n${a.repos.map(r=>`- ${r.owner}/${r.repo}: ${r.fileCount} arquivos`).join('\n')}`); addMsg('ai','Gerando repositório mesclado...'); const f=await fuse(); addMsg('ai',`Repositório mesclado criado. ZIP: ${f.fileName}\nVocê também pode abrir em “Repositórios mesclados” para ver a árvore de arquivos.`); }catch(e){ addMsg('ai','Erro: '+e.message); toast(e.message); } }
async function loadProjects(){ try{ const data=await api('/api/projects'); state.projects=data.projects||[]; renderProjects(); }catch(e){ renderProjects(); } }
function projectIdOf(p){ return p.id || p.jobId || p.projectId || ''; }
function projectFilesOf(p){ return p.fileCount ?? p.files ?? 0; }
function renderProjects(){
  const box=$('projectGrid');
  if(!box) return;
  if(!state.projects.length){ box.innerHTML='<p class="status">Nenhum repositório mesclado ainda.</p>'; return; }
  box.innerHTML=state.projects.map(p=>{
    const id=projectIdOf(p);
    const repos=(p.repos||[]).map(r=>r.repo||r.safe||r.url).filter(Boolean).slice(0,3).join(' + ');
    return `<button class="folder-card project-folder" data-open-project="${esc(id)}">
      <svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v9H3z"/></svg>
      <strong>${esc(p.name||id)}</strong>
      <small>${esc(projectFilesOf(p))} itens · ${esc(repos || 'projeto mesclado')}</small>
      <span class="folder-actions"><em data-project-wiki="${esc(id)}">Wiki</em><em data-project-export="${esc(id)}">ZIP</em></span>
    </button>`;
  }).join('');
}
function flattenTree(nodes=[], prefix=''){
  const out=[];
  for(const n of nodes){
    const full=n.path || (prefix ? `${prefix}/${n.name}` : n.name);
    out.push({ ...n, path: full });
    if(n.children?.length) out.push(...flattenTree(n.children, full));
  }
  return out;
}
function renderTreeNodes(nodes=[], depth=0){
  return nodes.map(n=>{
    const isDir=n.type==='dir' || Array.isArray(n.children);
    const icon=isDir?'▸':'·';
    const children=isDir && n.children?.length ? `<div class="tree-children">${renderTreeNodes(n.children, depth+1)}</div>` : '';
    return `<div class="tree-node" style="--depth:${depth}">
      <button class="tree-row ${isDir?'dir':'file'}" data-file-path="${esc(n.path)}" data-file-type="${isDir?'dir':'file'}">
        <span class="tree-caret">${icon}</span><span>${esc(n.name)}</span>
      </button>${children}
    </div>`;
  }).join('');
}
async function openProject(projectId){
  if(!projectId) return toast('Projeto inválido.');
  state.activeProjectId=projectId; state.activeFilePath='';
  try{
    const data=await api(`/api/projects/${encodeURIComponent(projectId)}/tree`);
    const project=data.project || state.projects.find(p=>projectIdOf(p)===projectId) || {};
    const nodes=data.tree || data.files || [];
    if($('treeTitle')) $('treeTitle').textContent=project.name || data.name || 'Arquivos';
    if($('treeMeta')) $('treeMeta').textContent=`${flattenTree(nodes).length} itens · árvore do projeto`;
    if($('fileTree')) $('fileTree').innerHTML=renderTreeNodes(nodes);
    if($('filePreview')) $('filePreview').textContent='Selecione um arquivo para visualizar o conteúdo. Pastas podem ser expandidas pela árvore.';
    if($('filePreviewPath')) $('filePreviewPath').textContent='Nenhum arquivo selecionado';
    $('treePanel')?.classList.remove('hidden');
    $('closeTree')?.classList.remove('hidden');
  }catch(e){ toast(e.message); }
}
async function openProjectFile(filePath){
  if(!state.activeProjectId || !filePath) return;
  state.activeFilePath=filePath;
  try{
    const data=await api(`/api/projects/${encodeURIComponent(state.activeProjectId)}/file?path=${encodeURIComponent(filePath)}`);
    if($('filePreviewPath')) $('filePreviewPath').textContent=data.path || filePath;
    if($('filePreview')) $('filePreview').textContent=data.content || 'Arquivo vazio.';
  }catch(e){ toast(e.message); }
}
async function renameActiveProject(){
  if(!state.activeProjectId) return;
  const project=state.projects.find(p=>projectIdOf(p)===state.activeProjectId);
  const name=prompt('Novo nome do projeto:', project?.name || state.activeProjectId);
  if(!name) return;
  try{ await api(`/api/projects/${encodeURIComponent(state.activeProjectId)}`,{method:'PATCH',body:JSON.stringify({name})}); await loadProjects(); await openProject(state.activeProjectId); toast('Projeto renomeado.'); }catch(e){ toast(e.message); }
}
async function deleteActiveProject(){
  if(!state.activeProjectId) return;
  if(!confirm('Excluir este projeto mesclado e seus arquivos locais?')) return;
  try{ await api(`/api/projects/${encodeURIComponent(state.activeProjectId)}`,{method:'DELETE'}); $('treePanel')?.classList.add('hidden'); $('closeTree')?.classList.add('hidden'); state.activeProjectId=''; await loadProjects(); toast('Projeto excluído.'); }catch(e){ toast(e.message); }
}
async function exportActiveProject(){
  if(!state.activeProjectId) return;
  window.location.href=`${API_BASE}/api/projects/${encodeURIComponent(state.activeProjectId)}/export`;
}

async function loadPublishPanel(){
  try{ await loadProjects(); }catch{}
  const sel=$('publishProjectSelect');
  if(!sel) return;
  const projects=state.projects||[];
  sel.innerHTML = projects.length ? projects.map(p=>`<option value="${esc(p.id || p.jobId)}">${esc(p.name || p.id || p.jobId)}</option>`).join('') : '<option value="">Nenhum projeto mesclado salvo</option>';
  const first=projects[0];
  if(first){
    sel.value=first.id||first.jobId;
    if(!$('publishName').value) $('publishName').value=(first.name||'gitfusion-project').toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
    if(!$('publishDescription').value) $('publishDescription').value='Projeto mesclado com GitFusion';
  }
}
function githubHeaders(){ const t=token(); return t ? {'x-github-token':t} : {}; }
function selectedPublishProject(){ return $('publishProjectSelect')?.value || state.currentProjectId || state.jobId || ''; }
function setGithubLog(text){ const el=$('githubLog'); if(el) el.textContent = text; }
function toggleIconButton(id){ const b=$(id); if(!b) return true; const on=b.dataset.on !== 'false'; b.dataset.on = on ? 'false' : 'true'; b.classList.toggle('on', !on); return !on; }
async function publishGithub(){
  const projectId=selectedPublishProject();
  if(!projectId) return toast('Crie ou selecione um projeto mesclado primeiro.');
  if(!token()) return toast('Cole e salve/verifique um token do GitHub.');
  setGithubLog('Publicando no GitHub...\nCriando repositório, gerando README/TASKS, commitando e fazendo push.');
  try{
    const data=await api('/api/github/publish',{method:'POST',headers:githubHeaders(),body:JSON.stringify({
      token:token(),
      projectId,
      repoName:$('publishName')?.value || 'gitfusion-project',
      description:$('publishDescription')?.value || 'Projeto mesclado com GitFusion',
      private:$('publishPrivate')?.dataset.on !== 'false',
      branch:$('publishBranch')?.value || 'main',
      includeReadme:$('publishReadme')?.dataset.on !== 'false',
      includeTasks:$('publishTasks')?.dataset.on !== 'false'
    })});
    setGithubLog(`Publicado com sucesso.\nURL: ${data.repo?.url}\nBranch: ${data.branch}`);
    toast('Projeto publicado no GitHub.');
  }catch(e){ setGithubLog('Falha ao publicar:\n'+e.message); toast(e.message); }
}
async function githubBranches(){
  const projectId=selectedPublishProject();
  if(!projectId) return toast('Selecione um projeto.');
  try{ const d=await api(`/api/github/${encodeURIComponent(projectId)}/branches`); setGithubLog('Branches locais:\n'+(d.branches||[]).map(b=>`${b.current?'* ':'  '}${b.name}`).join('\n')); }
  catch(e){ setGithubLog('Falha ao listar branches:\n'+e.message); toast(e.message); }
}
async function githubNewBranch(){
  const projectId=selectedPublishProject();
  if(!projectId) return toast('Selecione um projeto.');
  const name=prompt('Nome da nova branch:', 'feature/gitfusion-update');
  if(!name) return;
  try{ const d=await api(`/api/github/${encodeURIComponent(projectId)}/branches`,{method:'POST',body:JSON.stringify({name})}); setGithubLog(`Branch criada/ativada: ${d.branch}`); toast('Branch criada.'); }
  catch(e){ setGithubLog('Falha ao criar branch:\n'+e.message); toast(e.message); }
}
async function githubPull(){
  const projectId=selectedPublishProject();
  if(!projectId) return toast('Selecione um projeto.');
  const branch=$('publishBranch')?.value || 'main';
  try{ const d=await api(`/api/github/${encodeURIComponent(projectId)}/pull`,{method:'POST',body:JSON.stringify({branch})}); setGithubLog((d.stdout||'Pull concluído.') + (d.stderr?'\n'+d.stderr:'')); toast('Pull concluído.'); }
  catch(e){ setGithubLog('Falha no pull:\n'+e.message); toast(e.message); }
}


function createProjectFolder(){
  ensureProjectFolders();
  const n=(state.projectFolders?.length||0)+1;
  const id='project_'+Date.now();
  state.projectFolders.unshift({id,title:`Novo projeto`,open:false,chats:[],createdAt:Date.now()});
  state.activeProjectFolderId=id;
  const chatId='chat_'+Date.now();
  state.chats.unshift({id:chatId,title:'Novo chat',projectId:id,messages:[{role:'ai',text:'Pasta de projeto criada. Adicione repositórios, arquivos ou peça uma análise.'}]});
  state.projectFolders[0].chats.unshift(chatId);
  state.activeChatId=chatId;
  save(); renderChats(); go('workspace'); toast('Pasta de projeto criada.');
}

function deleteProjectFolder(id){
  if(!id) return;
  const folder=state.projectFolders?.find(f=>f.id===id);
  if(!folder) return;
  if(!confirm(`Excluir o projeto "${folder.title}" e os chats dentro dele?`)) return;
  const chatIds=new Set(folder.chats||[]);
  state.chats=(state.chats||[]).filter(c=>!chatIds.has(c.id));
  state.projectFolders=(state.projectFolders||[]).filter(f=>f.id!==id);
  if(!state.chats.length){
    state.chats=[{id:'main',title:'Chat',projectId:null,sidebarHidden:true,messages:[{role:'ai',text:'Novo chat criado.'}]}];
  }
  state.activeProjectFolderId=state.projectFolders[0]?.id || null;
  state.activeChatId=state.chats[0]?.id || 'main';
  save(); renderChats(); go('workspace'); toast('Projeto excluído.');
}

function renderTasksPanel(){
  const box=$('tasksBoard'); if(!box) return;
  ensureProjectFolders();
  const folders=state.projectFolders||[];
  const projectId=state.activeProjectFolderId || folders[0]?.id || 'default';
  const tasks=(state.tasks||[]).filter(t=>!t.projectId || t.projectId===projectId);
  box.innerHTML=`<div class="tasklight-shell"><div class="tasklight-search"><svg viewBox="0 0 24 24"><path d="M10 18a8 8 0 1 1 5.7-2.3L21 21"/></svg><input id="taskSearch" placeholder="Search anything"></div><div class="task-section-title">Essentials</div><button class="task-nav-row active"><svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>Dashboard</button><button class="task-nav-row"><svg viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M3 10h18M5 5h14v16H5z"/></svg>Tasks</button><div class="task-tree-list"><div class="task-branch-line"></div><button class="task-sub-row active">All tasks <small>${tasks.length}</small></button>${tasks.map(t=>`<button class="task-sub-row" data-task-toggle="${esc(t.id)}"><span>[${esc(t.status||'Task')}] ${esc(t.title)}</span></button>`).join('')}</div></div>`;
}
function addTask(title, projectId){
  state.tasks=state.tasks||[];
  state.tasks.unshift({id:'task_'+Date.now(),title,status:'pendente',projectId:projectId || state.activeProjectFolderId || 'default'});
  save(); renderTasksPanel();
}

document.addEventListener('click',e=>{ const pf=e.target.closest('[data-open-project-folder]'); if(pf){ openProjectFolderPage(pf.dataset.openProjectFolder); return; } const df=e.target.closest('[data-delete-folder]'); if(df){ e.stopPropagation(); deleteProjectFolder(df.dataset.deleteFolder); return; } const task=e.target.closest('[data-task-toggle]'); if(task){ const t=state.tasks.find(x=>x.id===task.dataset.taskToggle); if(t){ t.status=t.status==='feito'?'pendente':'feito'; save(); renderTasksPanel(); } } const dg=e.target.closest('[data-go]'); if(dg && !dg.closest('.topbar')){ go(dg.dataset.go); return; } const rm=e.target.closest('[data-rmrepo]'); if(rm) removeRepo(Number(rm.dataset.rmrepo)); const rf=e.target.closest('[data-rmfile]'); if(rf){ state.attachments.splice(Number(rf.dataset.rmfile),1); renderAttachments(); } const ch=e.target.closest('[data-chat]'); if(ch && !e.target.closest('[data-delete-chat]')){ state.activeChatId=ch.dataset.chat; save(); renderChats(); go('chat'); } const del=e.target.closest('[data-delete-chat]'); if(del){ e.stopPropagation(); deleteChat(del.dataset.deleteChat); } const op=e.target.closest('[data-open-project]'); if(op) openProject(op.dataset.openProject); const row=e.target.closest('[data-file-path]'); if(row){ if(row.dataset.fileType==='dir') row.closest('.tree-node')?.classList.toggle('open'); else openProjectFile(row.dataset.filePath); } const ex=e.target.closest('[data-project-export]'); if(ex){ e.preventDefault(); e.stopPropagation(); window.location.href=`${API_BASE}/api/projects/${encodeURIComponent(ex.dataset.projectExport)}/export`; } });
$('openSide').onclick=()=>document.body.classList.add('nav-open'); $('closeSide').onclick=()=>document.body.classList.remove('nav-open'); $('bottomChat').onclick=()=>{ document.body.classList.remove('nav-open'); if(!state.activeChatId) state.activeChatId='main'; go('chat'); renderMessages(); }; $('profileBtn').onclick=()=>go('settings');
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
$('newProject').onclick=()=>{ state.repos=[]; state.jobId=null; state.downloadUrl=null; createProjectFolder(); renderRepos(); renderChats(); go('workspace'); };
$('moreBtn').onclick=()=>{ updateMoreMenuTitle(); $('moreMenu').classList.toggle('hidden'); }; if($('newChatTop')) $('newChatTop').onclick=()=>{ state.activeProjectFolderId=null; newChat(); }; if($('playModeBtn')) $('playModeBtn').onclick=()=>{ if(state.activePage==='workspace') startFusion(); else go('chat'); };
if($('shareChat')) $('shareChat').onclick=()=>{ $('moreMenu').classList.add('hidden'); shareCurrentChat(); };
if($('pinChat')) $('pinChat').onclick=()=>{ $('moreMenu').classList.add('hidden'); togglePinChat(); };
if($('addPeople')) $('addPeople').onclick=()=>{ $('moreMenu').classList.add('hidden'); addPeople(); };
if($('addToProject')) $('addToProject').onclick=()=>{ $('moreMenu').classList.add('hidden'); addCurrentToProject(); };
if($('uploadedFiles')) $('uploadedFiles').onclick=()=>{ $('moreMenu').classList.add('hidden'); showUploadedFiles(); };
if($('addHome')) $('addHome').onclick=()=>{ $('moreMenu').classList.add('hidden'); addCurrentToHome(); };
if($('archiveChat')) $('archiveChat').onclick=()=>{ $('moreMenu').classList.add('hidden'); archiveCurrentChat(); };
if($('renameChat')) $('renameChat').onclick=()=>{ const n=prompt('Novo nome do chat:', chat().title); if(n){ chat().title=n; save(); renderChats(); } $('moreMenu').classList.add('hidden'); };
$('deleteChat').onclick=()=>{ deleteChat(state.activeChatId); $('moreMenu').classList.add('hidden'); };
if($('saveProjectView')) $('saveProjectView').onclick=async()=>{ $('moreMenu').classList.add('hidden'); await loadProjects(); go('library'); toast('Área do projeto salva em Mesclados.'); };
$('mainInput').addEventListener('input',autoGrow); $('mainInput').addEventListener('focus',()=>$('composer').classList.add('focused')); $('mainInput').addEventListener('blur',()=>{ if(!$('mainInput').value.trim() && !state.attachments.length) $('composer').classList.remove('focused'); }); $('mainInput').addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendText(); }}); $('sendBtn').onclick=sendText;
$('plusBtn').onclick=()=>$('toolsMenu').classList.toggle('hidden'); $('attachFile').onclick=()=>$('filePicker').click(); $('filePicker').onchange=()=>{ state.attachments=[...$('filePicker').files].map(f=>({name:f.name,size:f.size,type:f.type})); renderAttachments(); $('toolsMenu').classList.add('hidden'); };
$('analyzeBtn').onclick=async()=>{ try{ if(state.activePage!=='chat') createProjectChat('Análise de repositórios'); addMsg('user','Analisar repositórios'); const a=await analyze(); addMsg('ai',`Análise concluída:\n${a.repos.map(r=>`- ${r.owner}/${r.repo}: ${r.fileCount} arquivos · ${(r.stack||[]).join(', ')}`).join('\n')}`); }catch(e){ toast(e.message); }};
$('fuseBtn').onclick=startFusion; $('openLibrary').onclick=()=>{ go('library'); loadProjects(); $('toolsMenu').classList.add('hidden'); };
$('micBtn').onclick=()=>toast('Microfone visual pronto. No APK/WebView pode receber reconhecimento de voz.');
$('closeTree').onclick=()=>$('treePanel').classList.add('hidden');
$('saveToken').onclick=()=>{ if(!$('githubToken').value.trim()) return toast('Cole o token.'); localStorage.setItem('gitfusion.githubToken',$('githubToken').value.trim()); toast('Token salvo localmente.'); };
$('verifyToken').onclick=async()=>{ try{ const d=await api('/api/github/me'); $('githubStatus').innerHTML=`Conectado como <b>${esc(d.login)}</b>`; }catch(e){ $('githubStatus').textContent='Falha: '+e.message; }};
$('publishGithub').onclick=publishGithub; if($('githubBranches')) $('githubBranches').onclick=githubBranches; if($('githubNewBranch')) $('githubNewBranch').onclick=githubNewBranch; if($('githubPull')) $('githubPull').onclick=githubPull; ['publishPrivate','publishReadme','publishTasks'].forEach(id=>{ if($(id)) $(id).onclick=()=>toggleIconButton(id); }); if($('publishProjectSelect')) $('publishProjectSelect').onchange=()=>{ const p=(state.projects||[]).find(x=>(x.id||x.jobId)===$('publishProjectSelect').value); if(p && !$('publishName').value) $('publishName').value=(p.name||'gitfusion-project').toLowerCase().replace(/[^a-z0-9._-]+/g,'-'); }; $('clearLocal').onclick=()=>{ localStorage.removeItem('gitfusion.v15'); toast('Dados locais limpos.'); location.reload(); };

async function loadMemorySafe(){ if(!$('memoryInput')) return; try{ const d=await api('/api/ai/memory'); $('memoryInput').value=d.memory||''; $('memoryStatus').textContent=d.updatedAt?('Atualizada em '+new Date(d.updatedAt).toLocaleString()):'Memória vazia.'; }catch(e){ $('memoryStatus').textContent='Falha ao carregar: '+e.message; } }
function applyUiPrefs(){
  const motion=(localStorage.getItem('gitfusion.motion')??'1')==='1';
  document.body.classList.toggle('no-motion',!motion);
  const mb=$('motionToggleBtn'); if(mb) mb.classList.toggle('on',motion);

  const compact=localStorage.getItem('gitfusion.compact')==='1';
  document.body.classList.toggle('compact-mode',compact);
  const cb=$('compactToggleBtn'); if(cb) cb.classList.toggle('on',compact);

  const accent=localStorage.getItem('gitfusion.accent')||'60';
  document.documentElement.style.setProperty('--accent-glow', String(Number(accent)/100));
  if($('accentRange')) $('accentRange').value=accent;

  const stars=(localStorage.getItem('gitfusion.stars')??'1')==='1';
  document.body.classList.toggle('stars-enabled',stars);
  const st=$('themeStarsToggle'); if(st) st.classList.toggle('on',stars);

  const starSpeed=localStorage.getItem('gitfusion.starSpeed')||'18';
  document.documentElement.style.setProperty('--star-speed', starSpeed+'s');
  if($('starSpeedRange')) $('starSpeedRange').value=starSpeed;

  const glow=localStorage.getItem('gitfusion.glow')||accent||'60';
  document.documentElement.style.setProperty('--accent-glow', String(Number(glow)/100));
  if($('glowRange')) $('glowRange').value=glow;

  const keywords=localStorage.getItem('gitfusion.keywordHighlight')==='1';
  document.body.classList.toggle('keywords-on',keywords);
  const kh=$('keywordHighlightToggle'); if(kh) kh.classList.toggle('on',keywords);

  const btn=localStorage.getItem('gitfusion.buttonColor')||'';
  const txt=localStorage.getItem('gitfusion.textColor')||'';
  const sys=localStorage.getItem('gitfusion.systemColor')||'';
  const acc=localStorage.getItem('gitfusion.accentColor')||'';
  const icon=localStorage.getItem('gitfusion.iconColor')||'';
  if(btn) document.documentElement.style.setProperty('--custom-button',btn);
  if(txt) document.documentElement.style.setProperty('--custom-text',txt);
  if(sys) document.documentElement.style.setProperty('--custom-system',sys);
  if(icon) document.documentElement.style.setProperty('--custom-icon',icon);
  if(acc) document.documentElement.style.setProperty('--accent',acc);
  if($('buttonColorPicker')) $('buttonColorPicker').value=btn || '#f3f3f4';
  if($('textColorPicker')) $('textColorPicker').value=txt || '#f3f3f4';
  if($('systemColorPicker')) $('systemColorPicker').value=sys || '#b44cff';
  if($('iconColorPicker')) $('iconColorPicker').value=icon || '#b44cff';
  if($('accentColorPicker')) $('accentColorPicker').value=acc || '#b44cff';
}

const THEMES = [
  {id:'chatgpt', name:'ChatGPT Minimal', desc:'Escuro limpo, menus leves e foco no chat.', preview:'minimal'},
  {id:'space', name:'GitFusion Space', desc:'Tema principal com estrelas em movimento e assinatura roxa.', preview:'space'},
  {id:'cyberpunk', name:'Cyberpunk Roxo', desc:'Neon roxo mais intenso, cards escuros e visual de energia.', preview:'cyberpunk'},
  {id:'vscode', name:'VS Code Dark', desc:'Arquivos, árvore e painéis com sensação de editor.', preview:'vscode'},
  {id:'terminal', name:'Terminal Hacker', desc:'Contraste verde, linhas duras e textura de terminal.', preview:'terminal'},
  {id:'clean', name:'Clean Mobile', desc:'Mais claro, simples e direto para uso diário.', preview:'clean'}
];
function applyTheme(id=state.theme){
  state.theme=id;
  localStorage.setItem('gitfusion.theme',id);
  document.body.classList.remove('theme-chatgpt','theme-space','theme-cyberpunk','theme-vscode','theme-terminal','theme-clean');
  document.body.classList.add('theme-'+id);
  document.querySelectorAll('[data-theme-card]').forEach(el=>el.classList.toggle('active',el.dataset.themeCard===id));
}
function renderThemes(){
  const box=$('themeGrid');
  if(!box) return;
  box.innerHTML=THEMES.map(t=>`<button class="theme-card ${t.id===state.theme?'active':''}" data-theme-card="${t.id}">
    <span class="theme-preview ${t.preview}"></span>
    <strong>${esc(t.name)}</strong>
    <small>${esc(t.desc)}</small>
  </button>`).join('');
  box.querySelectorAll('[data-theme-card]').forEach(btn=>btn.onclick=()=>{ applyTheme(btn.dataset.themeCard); toast('Tema aplicado.'); });
}


async function loadWorkspacePanel(){
  try{
    const [status, settings] = await Promise.all([api('/api/workspace/status'), api('/api/workspace/settings')]);
    if($('workspaceProjectCount')) $('workspaceProjectCount').textContent = status.projects ?? 0;
    if($('workspaceJobCount')) $('workspaceJobCount').textContent = status.jobs ?? 0;
    if($('workspaceSize')) $('workspaceSize').textContent = status.sizeLabel || '0 KB';
    if($('workspaceName')) $('workspaceName').value = settings.name || status.active?.name || 'Pessoal';
    if($('workspacePath')) $('workspacePath').value = status.relativeRoot || 'workspaces/';
    renderWorkspaceList(status.workspaces || settings.workspaces || [], status.active?.id || settings.activeId);
  }catch(e){ toast('Espaço: '+e.message); }
}
function renderWorkspaceList(list=[], activeId=''){
  const box=$('workspaceList');
  if(!box) return;
  box.innerHTML=list.map(w=>`<div class="workspace-item ${w.id===activeId?'active':''}">
    <button data-workspace-active="${esc(w.id)}"><strong>${esc(w.name)}</strong><small>${esc(w.id)}</small></button>
    ${w.id==='pessoal'?'':`<button class="delete-one visible" data-workspace-delete="${esc(w.id)}">×</button>`}
  </div>`).join('') || '<p class="status">Nenhum espaço encontrado.</p>';
}
async function saveWorkspacePanel(){
  try{ await api('/api/workspace/settings',{method:'POST',body:JSON.stringify({name:$('workspaceName')?.value || 'Pessoal'})}); toast('Espaço de trabalho salvo.'); await loadWorkspacePanel(); }catch(e){ toast(e.message); }
}
async function createWorkspacePanel(){
  const name=($('newWorkspaceName')?.value || '').trim();
  if(!name) return toast('Dê um nome ao novo espaço.');
  try{ await api('/api/workspace/create',{method:'POST',body:JSON.stringify({name})}); $('newWorkspaceName').value=''; toast('Espaço criado.'); await loadWorkspacePanel(); }catch(e){ toast(e.message); }
}
async function setWorkspacePanel(id){
  try{ await api('/api/workspace/active',{method:'POST',body:JSON.stringify({id})}); toast('Espaço ativo alterado.'); await loadWorkspacePanel(); await loadProjects(); }catch(e){ toast(e.message); }
}
async function deleteWorkspacePanel(id){
  if(!confirm('Excluir este espaço de trabalho local?')) return;
  try{ await api('/api/workspace/'+encodeURIComponent(id),{method:'DELETE'}); toast('Espaço removido.'); await loadWorkspacePanel(); }catch(e){ toast(e.message); }
}
async function cleanWorkspaceTmp(){
  try{ const d=await api('/api/workspace/tmp',{method:'DELETE'}); toast(`Temporários limpos: ${d.removed||0}`); await loadWorkspacePanel(); await loadProjects(); }catch(e){ toast(e.message); }
}
function saveProfilePanel(){
  const name=($('profileNameInput')?.value || 'Toby Santos').trim() || 'Toby Santos';
  localStorage.setItem('gitfusion.profileName', name);
  renderProfile(); renderMessages(); toast('Perfil salvo.');
}
function handleProfilePhoto(file){
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{ localStorage.setItem('gitfusion.profilePhoto', reader.result); renderProfile(); toast('Foto adicionada.'); };
  reader.readAsDataURL(file);
}


async function refreshConnectionDot(){
  try{
    const status=await api('/api/connectivity/status');
    renderConnectivity(status);
  }catch(e){
    const dot=$('chatConnectionDot');
    if(dot){ dot.classList.remove('online','auto'); dot.classList.add('offline'); dot.title='Sem conexão com backend/status'; }
  }
}


function wikiLinksFrom(content=''){
  return [...String(content).matchAll(/\[\[([^\]]+)\]\]/g)].map(m=>m[1].trim()).filter(Boolean);
}
async function renderWikiBacklinksAndGraph(){
  const back=$('wikiBacklinks'), graph=$('wikiGraph');
  if(!back || !graph) return;
  const active=state.wiki.activeSlug;
  const title=($('wikiPageTitle')?.value || active || 'Wiki').trim();
  const pages=state.wiki.pages || [];
  const backlinks=[];
  for(const p of pages){
    if(!state.wiki.projectId || p.slug===active) continue;
    try{
      const full=await api(`/api/wiki/${encodeURIComponent(state.wiki.projectId)}/pages/${encodeURIComponent(p.slug)}`);
      const content=full.page?.content||'';
      const links=wikiLinksFrom(content).map(x=>x.toLowerCase());
      if(links.includes(title.toLowerCase()) || links.includes(String(active||'').toLowerCase())) backlinks.push({slug:p.slug,title:p.title});
    }catch(e){}
  }
  back.innerHTML = backlinks.length ? backlinks.map(b=>`<button class="backlink-row" data-wiki-page="${esc(b.slug)}"><strong>${esc(b.title)}</strong><small>${esc(b.slug)}</small></button>`).join('') : '<p class="status">Sem backlinks ainda.</p>';
  const currentLinks=wikiLinksFrom($('wikiPageEditor')?.value||'').slice(0,8);
  graph.innerHTML = `<span class="graph-node active">${esc(title||'Página')}</span>` + currentLinks.map(l=>`<span class="graph-line"></span><span class="graph-node">${esc(l)}</span>`).join('');
}



// Session 4: RAG local
async function loadRagPanel(){
  const statusEl=$('ragStatusText');
  try{
    const s=await api('/api/rag/status');
    if(statusEl) statusEl.textContent = s.ready ? `${s.totalDocuments} trechos indexados · ${s.mode}` : 'Índice vazio. Recrie para ativar a busca local.';
  }catch(e){ if(statusEl) statusEl.textContent='Falha: '+e.message; }
}
async function rebuildRagIndex(){
  const statusEl=$('ragStatusText'), results=$('ragResults');
  if(statusEl) statusEl.textContent='Indexando arquivos, memória e wiki...';
  if(results) results.innerHTML='<p class="status">Criando índice local offline...</p>';
  try{
    const s=await api('/api/rag/rebuild',{method:'POST',body:JSON.stringify({})});
    if(statusEl) statusEl.textContent=`${s.totalDocuments} trechos indexados · pronto`;
    if(results) results.innerHTML='<p class="status">Índice criado. Faça uma busca acima.</p>';
    toast('RAG local atualizado.');
  }catch(e){ if(statusEl) statusEl.textContent='Falha: '+e.message; toast(e.message); }
}
async function searchRagPanel(){
  const q=$('ragQuery')?.value?.trim() || '';
  const box=$('ragResults');
  if(!q) return toast('Digite algo para buscar.');
  box.innerHTML='<p class="status">Buscando no índice local...</p>';
  try{
    const d=await api(`/api/rag/search?q=${encodeURIComponent(q)}&limit=10`);
    if(!d.ready) { box.innerHTML='<p class="status">Índice vazio. Recrie o índice primeiro.</p>'; return; }
    box.innerHTML=(d.results||[]).map(r=>`<button class="rag-result"><span>${esc(r.sourceType)}</span><strong>${esc(r.title||r.path)}</strong><small>${esc(r.excerpt||'')}</small></button>`).join('') || '<p class="status">Nada encontrado.</p>';
  }catch(e){ box.innerHTML=`<p class="status">Falha: ${esc(e.message)}</p>`; }
}


// Session 8: Modo Aprendizado, professor do código
function flatTreeHtml(nodes=[], level=0){
  return nodes.map(n=>{
    const pad=Math.min(level*14,70);
    const icon=n.type==='dir'?'▸':'◇';
    const btn=`<button class="learning-tree-row ${n.type}" style="padding-left:${10+pad}px" data-learning-path="${esc(n.path)}" data-learning-type="${esc(n.type)}"><span>${icon}</span>${esc(n.name)}</button>`;
    return btn + (n.children?flatTreeHtml(n.children, level+1):'');
  }).join('');
}
async function loadLearningPanel(){
  await loadProjects();
  const sel=$('learningProjectSelect');
  if(sel){ sel.innerHTML='<option value="">Selecionar projeto mesclado</option>' + state.projects.map(p=>`<option value="${esc(p.id||p.jobId)}">${esc(p.name||p.id||p.jobId)}</option>`).join(''); }
  try{
    const data=await api('/api/learning/sources');
    state.learning.sources=data.sources||[];
    state.learning.activeId=data.activeId || state.learning.activeId || state.learning.sources[0]?.id || '';
    renderLearningSources();
    if(state.learning.activeId) await openLearningSource(state.learning.activeId);
  }catch(e){ const box=$('learningSources'); if(box) box.innerHTML=`<p class="status">${esc(e.message)}</p>`; }
}
function renderLearningSources(){
  const box=$('learningSources'); if(!box) return;
  if(!state.learning.sources.length){ box.innerHTML='<p class="status">Nenhuma fonte ainda.</p>'; return; }
  box.innerHTML=state.learning.sources.map(src=>`<div class="learning-source ${src.id===state.learning.activeId?'active':''}">
    <button data-learning-source="${esc(src.id)}"><strong>${esc(src.name)}</strong><small>${esc(src.kind)}${src.url?' · '+esc(src.url):''}</small></button>
    <button class="delete-one visible" data-learning-delete="${esc(src.id)}">×</button>
  </div>`).join('');
}
async function addLearningRepo(){
  const url=($('learningInput')?.value||'').trim().split(/\s+/).find(Boolean);
  if(!url) return toast('Cole um link de repositório GitHub.');
  try{ const d=await api('/api/learning/sources',{method:'POST',body:JSON.stringify({url})}); state.learning.activeId=d.source.id; $('learningInput').value=''; toast('Fonte adicionada ao aprendizado.'); await loadLearningPanel(); }catch(e){ toast(e.message); }
}
async function addLearningProject(){
  const projectId=$('learningProjectSelect')?.value;
  if(!projectId) return toast('Escolha um projeto mesclado.');
  const project=state.projects.find(p=>(p.id||p.jobId)===projectId);
  try{ const d=await api('/api/learning/sources',{method:'POST',body:JSON.stringify({projectId,name:project?.name||projectId})}); state.learning.activeId=d.source.id; toast('Projeto adicionado ao aprendizado.'); await loadLearningPanel(); }catch(e){ toast(e.message); }
}
async function openLearningSource(id){
  state.learning.activeId=id;
  renderLearningSources();
  const data=await api(`/api/learning/${encodeURIComponent(id)}/tree`);
  const title=$('learningSourceTitle'); if(title) title.value=data.source?.name||'Fonte de aprendizado';
  const box=$('learningTree'); if(box) box.innerHTML=flatTreeHtml(data.tree||[]) || '<p class="status">Nenhum arquivo encontrado.</p>';
  const exp=$('learningExplanation'); if(exp) exp.innerHTML='<p class="status">Abra um arquivo da árvore para receber uma aula sobre ele.</p>';
}
async function openLearningFile(relPath){
  if(!state.learning.activeId || !relPath) return;
  state.learning.activePath=relPath;
  try{
    const data=await api(`/api/learning/${encodeURIComponent(state.learning.activeId)}/file?path=${encodeURIComponent(relPath)}`);
    $('learningFileTitle').textContent=relPath;
    $('learningCode').textContent=data.content || 'Arquivo vazio.';
    $('learningExplanation').innerHTML='<p class="status">Código aberto. Toque em “Explicar” para receber uma aula.</p>';
  }catch(e){ toast(e.message); }
}
async function explainLearningFileNow(){
  if(!state.learning.activeId || !state.learning.activePath) return toast('Abra um arquivo primeiro.');
  $('learningExplanation').innerHTML='<p class="status">Preparando explicação...</p>';
  try{
    const data=await api(`/api/learning/${encodeURIComponent(state.learning.activeId)}/explain`,{method:'POST',body:JSON.stringify({path:state.learning.activePath})});
    $('learningExplanation').innerHTML=markdownToHtml(data.explanation || 'Sem explicação.');
  }catch(e){ $('learningExplanation').innerHTML=`<p class="status">${esc(e.message)}</p>`; }
}



function workspaceIdeNodeHtml(node, level=0){
  if(!node) return '';
  const pad=Math.min(level*14,70);
  const icon=node.type==='dir'?'M3 7h7l2 2h9v9H3z':'M14 2H6v20h12V8zM14 2v6h6';
  const action=node.type==='dir'?'data-ws-dir':'data-ws-file';
  const children=(node.children||[]).map(c=>workspaceIdeNodeHtml(c, level+1)).join('');
  return `<div class="ws-node ${node.type==='dir'?'dir':'file'}"><button style="padding-left:${pad}px" ${action}="${esc(node.path||'')}"><svg viewBox="0 0 24 24"><path d="${icon}"/></svg><span>${esc(node.name||'/')}</span>${node.type==='file'?`<small>${Math.ceil((node.size||0)/1024)}kb</small>`:''}</button>${children?`<div class="ws-children">${children}</div>`:''}</div>`;
}
async function loadWorkspaceIde(){
  const tree=$('workspaceIdeTree'); if(!tree) return;
  tree.innerHTML='<p class="status">Lendo workspace...</p>';
  try{
    const data=await api('/api/workspace/tree?maxDepth=8');
    if($('workspaceIdeMeta')) $('workspaceIdeMeta').textContent=`${data.active?.name||'Pessoal'} · ${data.root} · ${data.sizeLabel||'0 KB'}`;
    tree.innerHTML=workspaceIdeNodeHtml(data.tree) || '<p class="status">Workspace vazio.</p>';
    if(!$('workspaceIdeEditor')?.value && !state.workspaceIde?.activePath){ $('workspaceIdeStatus').textContent='Abra um arquivo ou crie um novo.'; }
  }catch(e){ tree.innerHTML=`<p class="status">${esc(e.message)}</p>`; }
}
async function openWorkspaceIdeFile(rel){
  if(!rel) return;
  try{
    const data=await api(`/api/workspace/file?path=${encodeURIComponent(rel)}`);
    state.workspaceIde={activePath:data.path}; save();
    $('workspaceIdePath').textContent=data.path;
    $('workspaceIdeEditor').value=data.content || '';
    $('workspaceIdeStatus').textContent=`Aberto · ${data.size} bytes · ${new Date(data.updatedAt).toLocaleString()}`;
    go('workspaceIde');
  }catch(e){ toast(e.message); }
}
async function saveWorkspaceIdeFile(){
  const rel=state.workspaceIde?.activePath;
  if(!rel) return toast('Abra ou crie um arquivo primeiro.');
  try{
    const data=await api('/api/workspace/file',{method:'POST',body:JSON.stringify({path:rel,content:$('workspaceIdeEditor').value})});
    $('workspaceIdeStatus').textContent=`Salvo · ${data.bytes} bytes${data.backup?' · backup criado':''}`;
    await loadWorkspaceIde();
  }catch(e){ toast(e.message); }
}
async function createWorkspaceIdeFile(){
  const rel=prompt('Caminho do arquivo dentro do workspace:', 'src/index.js');
  if(!rel) return;
  state.workspaceIde={activePath:rel}; save();
  $('workspaceIdePath').textContent=rel;
  $('workspaceIdeEditor').value='';
  $('workspaceIdeStatus').textContent='Arquivo novo. Escreva e salve.';
  go('workspaceIde');
}
async function createWorkspaceIdeFolder(){
  const rel=prompt('Nome/caminho da pasta:', 'src');
  if(!rel) return;
  try{ await api('/api/workspace/folder',{method:'POST',body:JSON.stringify({path:rel})}); toast('Pasta criada.'); await loadWorkspaceIde(); }catch(e){ toast(e.message); }
}
async function askBrainAboutWorkspaceFile(){
  const rel=state.workspaceIde?.activePath;
  if(!rel) return toast('Abra um arquivo primeiro.');
  const content=$('workspaceIdeEditor').value.slice(0,12000);
  go('chat');
  $('mainInput').value=`Analise e melhore este arquivo do workspace: ${rel}\n\n${content}`;
  autoGrow();
  toast('Arquivo colocado no chat para a IA analisar.');
}

async function init(){ load(); $('githubToken').value=localStorage.getItem('gitfusion.githubToken')||''; applyTheme(state.theme); applyUiPrefs(); renderProfile(); renderThemes(); renderRepos(); renderChats(); renderTasksPanel(); await loadProjects(); go('workspace'); refreshConnectionDot(); setInterval(refreshConnectionDot, 15000); }

function setMotion(v){ localStorage.setItem('gitfusion.motion',v?'1':'0'); applyUiPrefs(); }
if($('motionToggleBtn')) $('motionToggleBtn').onclick=()=>setMotion((localStorage.getItem('gitfusion.motion')??'1')!=='1');
if($('compactToggleBtn')) $('compactToggleBtn').onclick=()=>{ const next=localStorage.getItem('gitfusion.compact')!=='1'; localStorage.setItem('gitfusion.compact',next?'1':'0'); applyUiPrefs(); };
if($('accentRange')) $('accentRange').oninput=()=>{ localStorage.setItem('gitfusion.accent',$('accentRange').value); applyUiPrefs(); };
if($('themeStarsToggle')) $('themeStarsToggle').onclick=()=>{ const next=(localStorage.getItem('gitfusion.stars')??'1')!=='1'; localStorage.setItem('gitfusion.stars',next?'1':'0'); applyUiPrefs(); };
if($('starSpeedRange')) $('starSpeedRange').oninput=()=>{ localStorage.setItem('gitfusion.starSpeed',$('starSpeedRange').value); applyUiPrefs(); };
if($('glowRange')) $('glowRange').oninput=()=>{ localStorage.setItem('gitfusion.glow',$('glowRange').value); applyUiPrefs(); };
if($('keywordHighlightToggle')) $('keywordHighlightToggle').onclick=()=>{ const next=localStorage.getItem('gitfusion.keywordHighlight')!=='1'; localStorage.setItem('gitfusion.keywordHighlight',next?'1':'0'); applyUiPrefs(); renderMessages(); };
[['buttonColorPicker','gitfusion.buttonColor'],['textColorPicker','gitfusion.textColor'],['systemColorPicker','gitfusion.systemColor'],['iconColorPicker','gitfusion.iconColor'],['accentColorPicker','gitfusion.accentColor']].forEach(([id,key])=>{ if($(id)) $(id).oninput=()=>{ localStorage.setItem(key,$(id).value); applyUiPrefs(); }; });

if($('workspaceIdeRefresh')) $('workspaceIdeRefresh').onclick=loadWorkspaceIde;
if($('workspaceIdeSave')) $('workspaceIdeSave').onclick=saveWorkspaceIdeFile;
if($('workspaceIdeNewFile')) $('workspaceIdeNewFile').onclick=createWorkspaceIdeFile;
if($('workspaceIdeNewFolder')) $('workspaceIdeNewFolder').onclick=createWorkspaceIdeFolder;
if($('workspaceIdeAskBrain')) $('workspaceIdeAskBrain').onclick=askBrainAboutWorkspaceFile;
document.addEventListener('click',e=>{ const f=e.target.closest('[data-ws-file]'); if(f){ openWorkspaceIdeFile(f.dataset.wsFile); } });

if($('loadMemory')) $('loadMemory').onclick=loadMemorySafe;
if($('saveMemory')) $('saveMemory').onclick=async()=>{ try{ await api('/api/ai/memory',{method:'POST',body:JSON.stringify({memory:$('memoryInput').value})}); $('memoryStatus').textContent='Memória salva localmente.'; toast('Memória salva.'); }catch(e){ $('memoryStatus').textContent='Falha: '+e.message; } };
if($('exportDataset')) $('exportDataset').onclick=async()=>{ try{ const d=await api('/api/model/dataset'); const blob=new Blob([JSON.stringify(d.dataset||d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='gitfusion-dataset.json'; a.click(); URL.revokeObjectURL(a.href); toast('Dataset exportado.'); }catch(e){ toast(e.message); } };
if($('refreshProjects')) $('refreshProjects').onclick=async()=>{ await loadProjects(); toast('Projetos atualizados.'); go('library'); };
if($('refreshWorkspace')) $('refreshWorkspace').onclick=loadWorkspacePanel;
if($('saveWorkspace')) $('saveWorkspace').onclick=saveWorkspacePanel;
if($('openWorkspaceLibrary')) $('openWorkspaceLibrary').onclick=async()=>{ await loadProjects(); go('library'); };
if($('cleanWorkspaceTmp')) $('cleanWorkspaceTmp').onclick=cleanWorkspaceTmp;
if($('createWorkspace')) $('createWorkspace').onclick=createWorkspacePanel;
if($('saveProfile')) $('saveProfile').onclick=saveProfilePanel;
if($('chooseProfilePhoto')) $('chooseProfilePhoto').onclick=()=>$('profilePhotoPicker').click();
if($('removeProfilePhoto')) $('removeProfilePhoto').onclick=()=>{ localStorage.removeItem('gitfusion.profilePhoto'); renderProfile(); toast('Foto removida.'); };
if($('profilePhotoPicker')) $('profilePhotoPicker').onchange=()=>handleProfilePhoto($('profilePhotoPicker').files?.[0]);


// Session 3: Wiki por projeto
function markdownToHtml(md=''){
  const safe = esc(md);
  return safe
    .replace(/^### (.*)$/gm,'<h4>$1</h4>')
    .replace(/^## (.*)$/gm,'<h3>$1</h3>')
    .replace(/^# (.*)$/gm,'<h2>$1</h2>')
    .replace(/\[\[([^\]]+)\]\]/g,'<span class="wiki-link">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/^- (.*)$/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs,'<ul>$1</ul>')
    .replace(/\n\n/g,'</p><p>')
    .replace(/^/,'<p>').replace(/$/,'</p>')
    .replace(/<p><h/g,'<h').replace(/<\/h([234])><\/p>/g,'</h$1>')
    .replace(/<p><ul>/g,'<ul>').replace(/<\/ul><\/p>/g,'</ul>');
}
function slugFromTitle(title){ return String(title||'pagina').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'pagina'; }
async function ensureDefaultWikiPages(projectId){
  const current=await api(`/api/wiki/${encodeURIComponent(projectId)}`);
  if((current.wiki.pages||[]).length) return;
  const defaults=[
    ['home','Home',`# GitFusion Wiki\n\nEsta é a base de conhecimento local do GitFusion. Use esta área como um vault estilo Obsidian para registrar decisões, arquitetura e contexto dos projetos.\n\n## Comece por aqui\n\n- [[Arquitetura]]\n- [[Decisões]]\n- [[Repositórios]]\n- [[Memória]]\n\n#gitfusion #wiki`],
    ['arquitetura','Arquitetura',`# Arquitetura\n\nMapeie aqui como o projeto é organizado.\n\n## Camadas\n\n- Frontend\n- Backend\n- Serviços\n- Workspaces\n- IA / RAG\n\nRelacionado: [[Decisões]]`],
    ['decisoes','Decisões',`# Decisões\n\nRegistre decisões importantes da IA e do usuário.\n\n## Pendentes\n\n- Definir estratégia de fusão.\n- Aprovar tasks críticas.\n- Publicar no GitHub quando o pacote estiver pronto.\n\nRelacionado: [[Arquitetura]]`],
    ['repositorios','Repositórios',`# Repositórios\n\nLista dos repositórios analisados e mesclados.\n\nQuando um projeto real for criado, esta página será preenchida automaticamente.`],
    ['memoria','Memória',`# Memória\n\nNotas persistentes usadas pelo GitFusion para lembrar preferências, contexto e decisões.\n\nUse links como [[Home]] e tags como #preferencias.`]
  ];
  for(const [slug,title,content] of defaults){
    await api(`/api/wiki/${encodeURIComponent(projectId)}/pages`,{method:'POST',body:JSON.stringify({slug,title,content})});
  }
}
async function loadWikiPanel(){
  await loadProjects();
  const select=$('wikiProjectSelect');
  if(!select) return;
  const options=[{id:'gitfusion-vault',name:'GitFusion Vault'}, ...state.projects.map(p=>({id:p.id||p.jobId,name:p.name||p.id||p.jobId}))];
  select.innerHTML=options.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  if(state.wiki.projectId && options.some(o=>o.id===state.wiki.projectId)) select.value=state.wiki.projectId;
  if(!select.value) select.value='gitfusion-vault';
  state.wiki.projectId=select.value;
  await ensureDefaultWikiPages(state.wiki.projectId);
  await loadWiki(state.wiki.projectId);
}
async function loadWiki(projectId){
  state.wiki.projectId=projectId;
  try{
    const data=await api(`/api/wiki/${encodeURIComponent(projectId)}`);
    state.wiki.pages=data.wiki.pages||[];
    renderWikiPages();
    if(state.wiki.pages[0] && !state.wiki.activeSlug) await openWikiPage(state.wiki.pages[0].slug);
    else if(state.wiki.activeSlug) await openWikiPage(state.wiki.activeSlug);
  }catch(e){ $('wikiPagesList').innerHTML=`<p class="status">${esc(e.message)}</p>`; }
}
function renderWikiPages(){
  const box=$('wikiPagesList'); if(!box) return;
  if(!state.wiki.pages.length){ box.innerHTML='<p class="status">Nenhuma página ainda. Toque em “+” ou “Gerar wiki”.</p>'; return; }
  box.innerHTML=state.wiki.pages.map(p=>`<button class="wiki-page-row ${p.slug===state.wiki.activeSlug?'active':''}" data-wiki-page="${esc(p.slug)}"><svg viewBox="0 0 24 24"><path d="M7 4h10v16H7zM10 8h4M10 12h4"/></svg><span>${esc(p.title)}</span><small>${esc(p.slug)}</small></button>`).join('');
}
async function openWikiPage(slug){
  if(!state.wiki.projectId) return;
  const data=await api(`/api/wiki/${encodeURIComponent(state.wiki.projectId)}/pages/${encodeURIComponent(slug)}`);
  state.wiki.activeSlug=data.page.slug;
  $('wikiPageTitle').value=data.page.title||data.page.slug;
  $('wikiPageEditor').value=data.page.content||'';
  renderWikiPreview(); renderWikiPages(); renderWikiBacklinksAndGraph();
}
function renderWikiPreview(){ const prev=$('wikiPreview'); if(prev) prev.innerHTML=markdownToHtml($('wikiPageEditor')?.value||''); }
async function saveCurrentWikiPage(){
  if(!state.wiki.projectId) return toast('Selecione um projeto.');
  const title=$('wikiPageTitle').value.trim() || 'Nova página';
  const slug=state.wiki.activeSlug || slugFromTitle(title);
  const content=$('wikiPageEditor').value.trim() || `# ${title}\n\n`;
  const data=await api(`/api/wiki/${encodeURIComponent(state.wiki.projectId)}/pages/${encodeURIComponent(slug)}`,{method:'PUT',body:JSON.stringify({title,content})});
  state.wiki.activeSlug=data.page.slug; await loadWiki(state.wiki.projectId); toast('Página da wiki salva.');
}
async function deleteCurrentWikiPage(){
  if(!state.wiki.projectId || !state.wiki.activeSlug) return;
  await api(`/api/wiki/${encodeURIComponent(state.wiki.projectId)}/pages/${encodeURIComponent(state.wiki.activeSlug)}`,{method:'DELETE'});
  state.wiki.activeSlug=''; $('wikiPageTitle').value=''; $('wikiPageEditor').value=''; renderWikiPreview(); await loadWiki(state.wiki.projectId); toast('Página removida.');
}
async function generateWikiForProject(){
  if(!state.wiki.projectId) state.wiki.projectId='gitfusion-vault';
  $('wikiPagesList').innerHTML='<p class="status">Gerando wiki do projeto...</p>';
  await api(`/api/wiki/${encodeURIComponent(state.wiki.projectId)}/generate`,{method:'POST',body:JSON.stringify({})});
  state.wiki.activeSlug='home'; await loadWiki(state.wiki.projectId); toast('Wiki gerada.');
}
async function searchWikiPanel(){
  if(!state.wiki.projectId) return;
  const q=$('wikiSearch').value.trim();
  const data=await api(`/api/wiki/${encodeURIComponent(state.wiki.projectId)}/search?q=${encodeURIComponent(q)}`);
  const box=$('wikiSearchResults');
  box.innerHTML=(data.results||[]).map(r=>`<button class="wiki-result" data-wiki-page="${esc(r.slug)}"><strong>${esc(r.title)}</strong><small>${esc(r.excerpt||'')}</small></button>`).join('') || '<p class="status">Nada encontrado.</p>';
}


if($('renameProjectBtn')) $('renameProjectBtn').onclick=renameActiveProject;
if($('deleteProjectBtn')) $('deleteProjectBtn').onclick=deleteActiveProject;
if($('exportProjectBtn')) $('exportProjectBtn').onclick=exportActiveProject;
if($('copyFileContent')) $('copyFileContent').onclick=async()=>{ const txt=$('filePreview')?.textContent||''; try{ await navigator.clipboard.writeText(txt); toast('Conteúdo copiado.'); }catch{ toast('Não foi possível copiar.'); } };
if($('closeTree')) $('closeTree').onclick=()=>{ $('treePanel')?.classList.add('hidden'); $('closeTree')?.classList.add('hidden'); };

init();
applyThemeNow();
showOnboarding();

if($('rebuildRag')) $('rebuildRag').onclick=rebuildRagIndex;
if($('ragSearchBtn')) $('ragSearchBtn').onclick=searchRagPanel;
if($('ragQuery')) $('ragQuery').onkeydown=e=>{ if(e.key==='Enter') searchRagPanel(); };

// Session 2.1: Online / Offline mode
async function loadConnectivityMode(){
  try{
    const status = await api('/api/connectivity/status');
    renderConnectivity(status);
  }catch(e){
    const mode=currentRuntimeMode();
    const ollama=window.GitFusionAPKEngine?await window.GitFusionAPKEngine.probeOllama().catch(()=>({available:false})): {available:false};
    renderConnectivity({mode, effectiveMode:mode, internet:{available:false}, github:{available:false}, ai:{ready:ollama.available, effectiveProvider:ollama.available?'ollama':'apk-symbolic', local:ollama}});
    const box=$('connectivityStatusBox');
    if(box) box.innerHTML=`<div class="settings-row settings-card-row"><span>APK-first ativo<small>Servidor não respondeu. MemPalace/RAG local funciona no APK. Ollama: ${ollama.available?'detectado':'não detectado'}.</small></span></div>`;
  }
}
function renderConnectivity(status){
  document.querySelectorAll('[data-network-mode]').forEach(btn=>btn.classList.toggle('active', btn.dataset.networkMode===status.mode));
  const sum=$('connectivitySummary');
  if(sum) sum.textContent = status.mode==='auto'?'Automático':status.mode==='online'?'Online':'Offline';
  updateConnectionDot(status);
}
function updateConnectionDot(status){
  const dot=$('chatConnectionDot');
  const pill=$('chatModePill');
  const label=$('chatModeLabel');
  if(!dot && !pill) return;
  dot?.classList.remove('online','offline','auto');
  pill?.classList.remove('online','offline','auto');
  const effective=status?.effectiveMode || status?.mode || 'auto';
  const online = status?.internet?.available || status?.github?.available;
  let cls='auto', text='Auto', title='Detectando conexão';
  if(effective==='offline' || online===false){ cls='offline'; text='Offline'; title='Modo offline'; }
  else if(online){ cls='online'; text='Online'; title='Online'; }
  dot?.classList.add(cls);
  pill?.classList.add(cls);
  if(label) label.textContent=text;
  if(pill) pill.title=title;
  if(dot) dot.title=title;
}
async function setConnectivityMode(mode){
  localStorage.setItem('gitfusion.apkRuntime', mode);
  localStorage.setItem('gitfusion.connectivityMode', mode);
  try{
    const data=await api('/api/connectivity/mode',{method:'POST',body:JSON.stringify({mode})});
    renderConnectivity(data.status);
  }catch(e){
    const ollama=window.GitFusionAPKEngine?await window.GitFusionAPKEngine.probeOllama().catch(()=>({available:false})): {available:false};
    renderConnectivity({mode, effectiveMode:mode, internet:{available:mode==='online'}, github:{available:false}, ai:{ready:ollama.available || mode!=='offline', effectiveProvider:ollama.available?'ollama':'apk-symbolic', local:ollama}});
  }
  toast('Modo atualizado: '+normalizeModeLabel(mode));
}


document.addEventListener('click',e=>{
  const mode=e.target.closest('[data-network-mode]');
  if(mode) setConnectivityMode(mode.dataset.networkMode);
});
if($('refreshConnectivity')) $('refreshConnectivity').onclick=loadConnectivityMode;
if($('chatModePill')) $('chatModePill').onclick=()=>cycleConnectivityMode().catch(e=>toast(e.message));


// Wiki event bindings
if($('wikiProjectSelect')) $('wikiProjectSelect').onchange=()=>{ state.wiki.projectId=$('wikiProjectSelect').value; state.wiki.activeSlug=''; if(state.wiki.projectId) loadWiki(state.wiki.projectId); };
if($('newWikiPage')) $('newWikiPage').onclick=()=>{ state.wiki.activeSlug=''; $('wikiPageTitle').value='Nova página'; $('wikiPageEditor').value='# Nova página\n\nEscreva aqui. Use [[Links internos]] e #tags.'; renderWikiPreview(); renderWikiBacklinksAndGraph(); };
if($('generateWiki')) $('generateWiki').onclick=generateWikiForProject;
if($('newWikiPage')) $('newWikiPage').onclick=()=>{ state.wiki.activeSlug=''; $('wikiPageTitle').value='Nova página'; $('wikiPageEditor').value='# Nova página\n\n'; renderWikiPreview(); };
if($('saveWikiPage')) $('saveWikiPage').onclick=saveCurrentWikiPage;
if($('deleteWikiPage')) $('deleteWikiPage').onclick=deleteCurrentWikiPage;
if($('wikiPageEditor')) $('wikiPageEditor').oninput=()=>{ renderWikiPreview(); renderWikiBacklinksAndGraph(); };
if($('wikiSearchBtn')) $('wikiSearchBtn').onclick=searchWikiPanel;
if($('wikiSearch')) $('wikiSearch').onkeydown=e=>{ if(e.key==='Enter') searchWikiPanel(); };


document.addEventListener('click',e=>{
  const row=e.target.closest('[data-wiki-page]');
  if(row){ e.preventDefault(); e.stopPropagation(); go('wiki'); openWikiPage(row.dataset.wikiPage); }
  const projectWiki=e.target.closest('[data-project-wiki]');
  if(projectWiki){ e.preventDefault(); e.stopPropagation(); state.wiki.projectId=projectWiki.dataset.projectWiki; state.wiki.activeSlug=''; go('wiki'); }
});


// Session 9: Terminal flutuante no + do chat
const terminalState = { x: null, y: null, dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 };
function termEl(){ return $('floatingTerminal'); }
function termOutput(){ return $('terminalOutput'); }
function terminalLog(text, kind='info'){
  const out=termOutput(); if(!out) return;
  const div=document.createElement('div');
  div.className='term-line '+kind;
  div.textContent=String(text ?? '');
  out.appendChild(div);
  out.scrollTop=out.scrollHeight;
}
function openTerminal(){
  const el=termEl(); if(!el) return;
  el.classList.remove('hidden','minimized');
  if(!el.dataset.opened){ terminalLog('Aberto pelo menu +. Nada executa sem autorização.', 'info'); el.dataset.opened='1'; }
  $('toolsMenu')?.classList.add('hidden');
  setTimeout(()=>$('terminalInput')?.focus(), 60);
}
function closeTerminal(){ termEl()?.classList.add('hidden'); }
function toggleTerminalMinimize(){ termEl()?.classList.toggle('minimized'); }
function toggleTerminalExpand(){ termEl()?.classList.toggle('expanded'); }
function clearTerminal(){ if(termOutput()) termOutput().innerHTML='<div class="term-line info">Terminal limpo.</div>'; }
async function runTerminalCommand(command){
  const cmd=String(command||'').trim();
  if(!cmd) return;
  terminalLog('$ '+cmd, 'cmd');
  const ok=confirm('Autorizar o GitFusion a executar este comando no terminal?\n\n'+cmd);
  if(!ok){ terminalLog('Bloqueado pelo usuário.', 'err'); return; }
  terminalLog('Executando com permissão...', 'info');
  try{
    const data=await api('/api/terminal/run',{method:'POST',body:JSON.stringify({command:cmd})});
    if(data.stdout) terminalLog(data.stdout.trimEnd(), 'ok');
    if(data.stderr) terminalLog(data.stderr.trimEnd(), 'err');
    if(!data.stdout && !data.stderr) terminalLog('Comando finalizado sem saída.', 'ok');
    if(typeof data.code==='number') terminalLog('exit code: '+data.code, data.code===0?'info':'err');
  }catch(e){ terminalLog('Erro: '+e.message, 'err'); }
}
function bindTerminalDrag(){
  const el=termEl(), handle=$('terminalDragHandle');
  if(!el || !handle || handle.dataset.bound) return;
  handle.dataset.bound='1';
  handle.addEventListener('pointerdown', ev=>{
    if(ev.target.closest('button')) return;
    const rect=el.getBoundingClientRect();
    terminalState.dragging=true; terminalState.startX=ev.clientX; terminalState.startY=ev.clientY; terminalState.baseX=rect.left; terminalState.baseY=rect.top;
    el.classList.remove('expanded');
    handle.setPointerCapture(ev.pointerId);
  });
  handle.addEventListener('pointermove', ev=>{
    if(!terminalState.dragging) return;
    const nx=Math.max(6, Math.min(window.innerWidth-80, terminalState.baseX + ev.clientX-terminalState.startX));
    const ny=Math.max(52, Math.min(window.innerHeight-80, terminalState.baseY + ev.clientY-terminalState.startY));
    el.style.left=nx+'px'; el.style.top=ny+'px'; el.style.right='auto'; el.style.bottom='auto';
  });
  handle.addEventListener('pointerup', ev=>{ terminalState.dragging=false; try{handle.releasePointerCapture(ev.pointerId)}catch{} });
}
if($('openTerminalTool')) $('openTerminalTool').onclick=openTerminal;
if($('terminalClose')) $('terminalClose').onclick=closeTerminal;
if($('terminalMinimize')) $('terminalMinimize').onclick=toggleTerminalMinimize;
if($('terminalExpand')) $('terminalExpand').onclick=toggleTerminalExpand;
if($('terminalClear')) $('terminalClear').onclick=clearTerminal;
if($('terminalForm')) $('terminalForm').onsubmit=e=>{ e.preventDefault(); const input=$('terminalInput'); const cmd=input.value; input.value=''; runTerminalCommand(cmd); };
bindTerminalDrag();

// v22 session 12.6: preview play + swipe navigation. Isolated, no global composer changes.
function latestProject(){
  const projects = Array.isArray(state.projects) ? state.projects : [];
  return projects[0] || null;
}
async function ensureProjectsLoaded(){
  try{ await loadProjects(); }catch{}
  return latestProject();
}
async function openPreviewPanel(){
  const panel=$('previewPanel');
  if(!panel) return;
  let project = latestProject();
  if(!project) project = await ensureProjectsLoaded();
  if(!project){
    if($('previewProjectName')) $('previewProjectName').textContent='Aguardando projeto';
    const body=$('previewBody');
    if(body){
      body.innerHTML=`<div class="preview-empty">
        <strong>Preview aguardando projeto mesclado</strong>
        <span>Quando você mesclar um projeto e tocar no play, o preview local aparecerá aqui.</span>
      </div>`;
    }
    panel.classList.remove('hidden');
    return;
  }
  const id=projectIdOf(project);
  const name=project.name || id || 'Projeto GitFusion';
  const count=projectFilesOf(project);
  if($('previewProjectName')) $('previewProjectName').textContent=name;
  const body=$('previewBody');
  if(body){
    body.innerHTML=`<div class="preview-card">
      <h3>${esc(name)}</h3>
      <p>Preview local preparado para este projeto. Use a árvore de arquivos para visualizar a arquitetura ou exporte o pacote final.</p>
      <p><b>${esc(String(count || 0))}</b> itens detectados.</p>
      <div class="preview-buttons">
        <button id="previewOpenTreeNow">Abrir árvore</button>
        <a href="${API_BASE}/api/projects/${encodeURIComponent(id)}/export">Exportar ZIP</a>
      </div>
    </div>`;
    const openTree=$('previewOpenTreeNow');
    if(openTree) openTree.onclick=()=>openProject(id);
  }
  panel.classList.remove('hidden');
}
function closePreviewPanel(){ $('previewPanel')?.classList.add('hidden'); }
function refreshPreviewPanel(){ closePreviewPanel(); setTimeout(openPreviewPanel,80); }

if($('previewClose')) $('previewClose').onclick=closePreviewPanel;
if($('previewRefresh')) $('previewRefresh').onclick=refreshPreviewPanel;
if($('previewOpenFiles')) $('previewOpenFiles').onclick=async()=>{ const p=latestProject() || await ensureProjectsLoaded(); if(p) openProject(projectIdOf(p)); else toast('Nenhum projeto mesclado ainda.'); };
if($('playModeBtn')) $('playModeBtn').onclick=openPreviewPanel;



(function setupInteractiveDrawers(){
  const sidebar=$('sidebar');
  const preview=$('previewPanel');
  if(!sidebar) return;

  const isInteractive=(el)=> el && !!el.closest('input, textarea, select, [contenteditable="true"], .composer, .tools-menu, .menu-pop, button, a, .floating-terminal');
  const inMain=(el)=> el && !!el.closest('.main');
  const inSide=(el)=> el && !!el.closest('#sidebar');
  const sideW=()=> Math.min(sidebar.getBoundingClientRect().width || 310, window.innerWidth);
  const isSideOpen=()=> document.body.classList.contains('nav-open');

  let drag=null;
  let activePointer=null;

  function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
  function setProgress(v){ document.documentElement.style.setProperty('--drawer-progress', String(clamp(v,0,1))); }
  function setSideX(x){
    const v=`translate3d(${x}px,0,0)`;
    document.documentElement.style.setProperty('--gitfusion-side-x', v);
    sidebar.style.transform=v;
  }
  function resetSideX(){
    document.documentElement.style.removeProperty('--gitfusion-side-x');
    sidebar.style.transform='';
  }

  function startDrag(e){
    if(e.pointerType==='mouse' || activePointer!==null) return;
    if(isInteractive(e.target)) return;

    const startInMain=inMain(e.target);
    const startInSide=inSide(e.target);
    if(!startInMain && !startInSide) return;

    activePointer=e.pointerId;
    drag={
      sx:e.clientX, sy:e.clientY, lastX:e.clientX, lastT:performance.now(),
      t:performance.now(), mode:null, started:false,
      sideOpen:isSideOpen(), startInMain, startInSide
    };
    try{ e.target.setPointerCapture(e.pointerId); }catch{}
  }

  function decideMode(e){
    if(!drag || drag.started) return false;
    const dx=e.clientX-drag.sx;
    const dy=e.clientY-drag.sy;
    if(Math.abs(dx)<8) return false;
    if(Math.abs(dx)<Math.abs(dy)*1.08){ drag=null; activePointer=null; return false; }

    if(!drag.sideOpen && drag.startInMain && dx>0){
      // Session 14.14: only Chat <-> Sidebar gestures.
      // Preview can still be opened by its button, but never by swipe.
      drag.mode='openSide';
      setSideX(-sideW());
      setProgress(0);
    }else if(drag.sideOpen && drag.startInSide && dx<0){
      drag.mode='closeSide';
      setSideX(0);
      setProgress(1);
    }else{
      drag=null; activePointer=null; return false;
    }

    drag.started=true;
    document.body.classList.add('dragging-drawer');
    document.body.classList.remove('drawer-settling');
    if(preview && !preview.classList.contains('hidden')){
      // Keep preview from bleeding into the swipe layer.
      preview.classList.add('hidden');
      preview.style.transform='';
    }
    return true;
  }

  function moveDrag(e){
    if(!drag || e.pointerId!==activePointer) return;
    const now=performance.now();
    const dx=e.clientX-drag.sx;
    drag.lastX=e.clientX;
    drag.lastT=now;
    if(!drag.started && !decideMode(e)) return;
    if(!drag || !drag.mode) return;

    e.preventDefault();

    if(drag.mode==='openSide'){
      const w=sideW();
      const x=clamp(-w+dx,-w,0);
      setSideX(x);
      setProgress((x+w)/w);
    }
    if(drag.mode==='closeSide'){
      const w=sideW();
      const x=clamp(dx,-w,0);
      setSideX(x);
      setProgress((x+w)/w);
    }
  }

  function finishDrag(e, cancelled=false){
    if(!drag || (e && e.pointerId!==activePointer)) return;
    const dx=(e?.clientX ?? drag.lastX)-drag.sx;
    const dt=Math.max(16, performance.now()-drag.t);
    const velocity=dx/dt;
    const mode=drag.mode;
    const wSide=sideW();

    document.body.classList.remove('dragging-drawer');
    document.body.classList.add('drawer-settling');

    function done(){
      resetSideX();
      setProgress(0);
      document.body.classList.remove('drawer-settling');
      drag=null;
      activePointer=null;
    }

    if(cancelled || !mode){ done(); return; }

    if(mode==='openSide'){
      const open=dx>wSide*.28 || velocity>.55;
      if(open){ document.body.classList.add('nav-open'); resetSideX(); setProgress(1); setTimeout(done,190); }
      else{ setSideX(-wSide); setTimeout(done,190); }
      return;
    }

    if(mode==='closeSide'){
      const close=Math.abs(dx)>wSide*.28 || velocity<-.55;
      if(close){ setSideX(-wSide); setTimeout(()=>{ document.body.classList.remove('nav-open'); done(); },190); }
      else{ setSideX(0); setTimeout(()=>{ document.body.classList.add('nav-open'); done(); },190); }
      return;
    }

    done();
  }

  document.addEventListener('pointerdown',startDrag,{passive:true,capture:true});
  document.addEventListener('pointermove',moveDrag,{passive:false,capture:true});
  document.addEventListener('pointerup',finishDrag,{passive:true,capture:true});
  document.addEventListener('pointercancel',(e)=>finishDrag(e,true),{passive:true,capture:true});
})();

// Session 14.4: interactive page relation menus + quick creations
(function(){
  const pageMap={
    workspace:{label:'Principal',kind:'Projeto',relations:['Chat','Repositórios','Tasks','Preview'],creates:['Projeto','Chat','Task']},
    workspaceIde:{label:'Workspace',kind:'IDE local',relations:['Arquivos','Editor','Brain','Backups'],creates:['Arquivo','Pasta','Patch']},
    library:{label:'Biblioteca',kind:'Projetos',relations:['Mesclados','Árvore','Wiki','GitHub'],creates:['Projeto','Wiki','ZIP']},
    wiki:{label:'Wiki',kind:'Conhecimento',relations:['Memória','RAG','Projeto','Backlinks'],creates:['Página','Nota','Índice']},
    learning:{label:'Aprendizado',kind:'Professor',relations:['Repo','Arquivo','Wiki','Memória'],creates:['Aula','Fonte','Nota']},
    rag:{label:'Busca',kind:'Memória',relations:['Wiki','MemPalace','Projetos','Chat'],creates:['Índice','Consulta','Memória']},
    tasks:{label:'Tasks',kind:'Execução',relations:['Projeto','Terminal','IA','Logs'],creates:['Task','Checklist','Sprint']}
  };
  const actionable=new Set(['workspace','workspaceIde','library','wiki','learning','autoTrainer','rag','tasks']);
  function ensureMenu(){
    let menu=document.getElementById('pageActionMenu');
    if(menu) return menu;
    menu=document.createElement('div');
    menu.id='pageActionMenu';
    menu.className='page-action-menu hidden';
    document.body.appendChild(menu);
    return menu;
  }
  function iconFor(page){
    const icons={workspace:'M4 6h16v12H4zM8 10h8M8 14h5',library:'M3 7h7l2 2h9v9H3z',wiki:'M4 5h7a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4zM20 5h-7a3 3 0 0 0-3 3v11a3 3 0 0 1 3-3h7z',learning:'M4 19V5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 1-2-2zM8 7h5M8 11h6M8 15h4',rag:'M10 18a8 8 0 1 1 5.7-2.3L21 21M8 10h8M8 13h5',tasks:'M8 2v4M16 2v4M3 10h18M5 5h14v16H5zM8 14h8M8 18h5',workspaceIde:'M4 5h16v14H4zM8 9h8M8 13h5M6 5v14'};
    return `<svg viewBox="0 0 24 24"><path d="${icons[page]||icons.workspace}"/></svg>`;
  }
  function quickCreate(page){
    document.getElementById('pageActionMenu')?.classList.add('hidden');
    try{
      if(page==='workspace'){ if(typeof createProjectFolder==='function') createProjectFolder(); return; }
      if(page==='library'){ if(typeof loadProjects==='function') loadProjects(); if(typeof go==='function') go('library'); toast?.('Biblioteca atualizada. Abra um projeto para ver a árvore.'); return; }
      if(page==='wiki'){ if(typeof go==='function') go('wiki'); document.getElementById('newWikiPage')?.click(); return; }
      if(page==='learning'){ if(typeof go==='function') go('learning'); document.getElementById('learningRepoUrl')?.focus(); toast?.('Cole um repositório para começar uma aula.'); return; }
      if(page==='rag'){ if(typeof go==='function') go('rag'); document.getElementById('ragSearchInput')?.focus(); toast?.('Digite uma busca para consultar a memória.'); return; }
      if(page==='tasks'){ if(typeof addTask==='function') addTask(prompt('Nome da nova task:')||'Nova task'); if(typeof go==='function') go('tasks'); return; }
    }catch(e){ toast?.(e.message||'Não foi possível criar agora.'); }
  }
  function routeAction(page,action){
    document.getElementById('pageActionMenu')?.classList.add('hidden');
    if(action==='open'){ if(typeof go==='function') go(page); return; }
    if(action==='create'){ quickCreate(page); return; }
    if(action==='relations'){ if(typeof go==='function') go(page); toast?.(`Relações abertas: ${(pageMap[page]?.relations||[]).join(', ')}`); return; }
    if(action==='search'){
      if(page==='wiki'){ if(typeof go==='function') go('wiki'); document.getElementById('wikiSearch')?.focus(); return; }
      if(page==='rag'){ if(typeof go==='function') go('rag'); document.getElementById('ragSearchInput')?.focus(); return; }
      toast?.('Busca rápida ativada.'); return;
    }
  }
  function openMenuFor(page,anchor){
    const cfg=pageMap[page]; if(!cfg) return;
    const menu=ensureMenu();
    menu.innerHTML=`<div class="pam-title">${iconFor(page)}<span><b>${cfg.label}</b><small>${cfg.kind}</small></span></div>
      <button data-pam-act="open" data-pam-page="${page}"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg>Abrir área</button>
      <button data-pam-act="create" data-pam-page="${page}"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Criação rápida</button>
      <button data-pam-act="relations" data-pam-page="${page}"><svg viewBox="0 0 24 24"><path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7.8 6.8l7.4 3.4M6 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7.8 17.2l7.4-3.4"/></svg>Ver relações</button>
      <button data-pam-act="search" data-pam-page="${page}"><svg viewBox="0 0 24 24"><path d="M10 18a8 8 0 1 1 5.7-2.3L21 21"/></svg>Buscar dentro</button>
      <div class="pam-chips">${cfg.relations.map(r=>`<span>${r}</span>`).join('')}</div>`;
    const r=anchor.getBoundingClientRect();
    menu.style.left=Math.min(window.innerWidth-276, Math.max(12, r.right-6))+'px';
    menu.style.top=Math.min(window.innerHeight-270, Math.max(72, r.top-8))+'px';
    menu.classList.remove('hidden');
  }
  function enhanceSideItems(){
    document.querySelectorAll('.side-item[data-go], .side-action[data-go]').forEach(item=>{
      const page=item.dataset.go;
      if(!actionable.has(page) || item.dataset.enhanced==='true') return;
      item.dataset.enhanced='true';
      const wrap=document.createElement('span');
      wrap.className='side-item-tools';
      const create=document.createElement('button');
      create.className='side-mini-create'; create.title='Criação rápida'; create.dataset.pageCreate=page; create.textContent='+';
      const menu=document.createElement('button');
      menu.className='side-mini-menu'; menu.title='Menu da área'; menu.dataset.pageMenu=page; menu.innerHTML='›';
      wrap.append(create,menu); item.appendChild(wrap);
    });
  }
  document.addEventListener('click',e=>{
    const cm=e.target.closest('[data-page-create]');
    if(cm){ e.preventDefault(); e.stopPropagation(); quickCreate(cm.dataset.pageCreate); return; }
    const pm=e.target.closest('[data-page-menu]');
    if(pm){ e.preventDefault(); e.stopPropagation(); openMenuFor(pm.dataset.pageMenu,pm); return; }
    const act=e.target.closest('[data-pam-act]');
    if(act){ e.preventDefault(); e.stopPropagation(); routeAction(act.dataset.pamPage,act.dataset.pamAct); return; }
    if(!e.target.closest('#pageActionMenu')) document.getElementById('pageActionMenu')?.classList.add('hidden');
  },true);
  window.addEventListener('resize',()=>document.getElementById('pageActionMenu')?.classList.add('hidden'));
  setTimeout(enhanceSideItems,300);
})();



// Session 14.8: restore approved chat UI + clean folder Menu architecture.
// Menu items are navigation only. No quick-create or delete buttons inside Menu.
(function(){
  const MENU_PAGES = [
    {id:'library', label:'Repositórios mesclados', icon:'M3 7h7l2 2h9v9H3z'},
    {id:'learning', label:'Aprendizado', icon:'M4 19V5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 1-2-2zM8 7h5M8 11h6M8 15h4'},
    {id:'autoTrainer', label:'AutoTrainer', icon:'M12 3v4M12 17v4M4.2 6.2l2.8 2.8M17 17l2.8 2.8M3 12h4M17 12h4M9 9h6v6H9z'},
    {id:'wiki', label:'Wiki', icon:'M4 5h7a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4zM20 5h-7a3 3 0 0 0-3 3v11a3 3 0 0 1 3-3h7z'},
    {id:'tasks', label:'Tasks', icon:'M8 2v4M16 2v4M3 10h18M5 5h14v16H5zM8 14h8M8 18h5'},
    {id:'libraryBrief', go:'library', label:'Biblioteca', icon:'M4 5h16v14H4zM8 9h8M8 13h6'}
  ];
  const svg=(path)=>`<svg viewBox="0 0 24 24"><path d="${path}"/></svg>`;
  const realPage=(p)=>p?.go||p?.id;
  function pageById(id){return MENU_PAGES.find(p=>p.id===id)}
  function renderMenuFolder(){
    const pinned=document.getElementById('pinnedNav');
    if(pinned) pinned.innerHTML='';
    const panel=document.getElementById('pagesMenuPanel');
    if(!panel) return;
    panel.innerHTML=MENU_PAGES.map(p=>`<button class="page-menu-row folder-menu-page ${state.activePage===realPage(p)?'active':''}" data-menu-page="${p.id}">
      ${svg(p.icon)}
      <span>${p.label}</span>
    </button>`).join('');
    const toggle=document.getElementById('pagesMenuToggle');
    if(toggle){
      toggle.classList.toggle('open', !panel.classList.contains('hidden'));
      toggle.querySelector('.nav-caret') && (toggle.querySelector('.nav-caret').textContent = panel.classList.contains('hidden') ? '▸' : '▾');
    }
  }
  document.addEventListener('click',(e)=>{
    const toggle=e.target.closest('#pagesMenuToggle');
    if(toggle){ e.preventDefault(); const panel=document.getElementById('pagesMenuPanel'); panel?.classList.toggle('hidden'); renderMenuFolder(); return; }
    const search=e.target.closest('#searchIconBtn');
    if(search){ e.preventDefault(); e.stopPropagation(); document.body.classList.remove('nav-open'); go('rag'); setTimeout(()=>document.getElementById('ragSearchInput')?.focus(),80); return; }
    const row=e.target.closest('[data-menu-page]');
    if(row){ e.preventDefault(); e.stopPropagation(); const p=pageById(row.dataset.menuPage); if(p){ document.body.classList.remove('nav-open'); go(realPage(p)); } return; }
  },true);
  window.addEventListener('load',()=>{ localStorage.setItem('gitfusion.pinnedPages','[]'); renderMenuFolder(); });
  setTimeout(()=>{ localStorage.setItem('gitfusion.pinnedPages','[]'); renderMenuFolder(); },0);
  const _go=window.go;
  if(typeof _go==='function') window.go=function(page){ const r=_go(page); setTimeout(renderMenuFolder,0); return r; };
})();


// Session 14.10: compact tasks create button and clean menu rerender
(function(){
  const oldRenderTasks = window.renderTasksPanel || (typeof renderTasksPanel==='function' ? renderTasksPanel : null);
  window.renderTasksPanel = function(){
    if(oldRenderTasks) oldRenderTasks();
    const box=document.getElementById('tasksBoard');
    if(!box) return;
    if(!document.getElementById('createTaskInline')){
      const row=document.createElement('div');
      row.className='task-create-row';
      row.innerHTML='<button id="createTaskInline" class="task-create-btn" type="button"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Nova task</button>';
      box.prepend(row);
      row.querySelector('button').onclick=()=>{
        const title=prompt('Nome da nova task:','Nova task');
        if(title && typeof addTask==='function') addTask(title.trim()||'Nova task');
      };
    }
  };
  document.addEventListener('click',(e)=>{
    const row=e.target.closest('[data-menu-page]');
    if(row){
      setTimeout(()=>{
        document.querySelectorAll('.page-menu-row.folder-menu-page .menu-open-indicator').forEach(x=>x.remove());
      },0);
    }
  },true);
  window.addEventListener('load',()=>{
    document.querySelectorAll('.page-menu-row.folder-menu-page .menu-open-indicator').forEach(x=>x.remove());
  });
})();

// Session 16.2: APK-first local knowledge importer + runtime settings UI.
(function(){
  const q=(id)=>document.getElementById(id);
  const fmtBytes=(n)=>{ n=Number(n||0); if(n<1024) return n+' B'; if(n<1024*1024) return (n/1024).toFixed(1)+' KB'; return (n/1024/1024).toFixed(1)+' MB'; };
  function setStatus(id,msg){ const el=q(id); if(el) el.textContent=msg; }
  function engine(){ return window.GitFusionAPKEngine; }
  async function refreshKnowledgeStats(){
    if(!engine()?.knowledgeStats){ setStatus('knowledgeStatus','Motor APK local não carregado.'); return; }
    const st=await engine().knowledgeStats();
    setStatus('knowledgeStatus',`Base local: ${st.docs} arquivo(s), ${st.chunks} chunk(s), ${fmtBytes(st.bytes)} indexados.`);
  }
  async function importSelectedFiles(files){
    if(!files?.length) return;
    if(!engine()?.importFiles){ setStatus('knowledgeStatus','Importador local não carregou.'); return; }
    setStatus('knowledgeStatus',`Importando ${files.length} arquivo(s). Aguarde...`);
    const projectId = (typeof chat==='function' && chat()?.projectId) || (window.state?.activeProjectFolderId) || 'apk-local';
    const result = await engine().importFiles(files,{projectId});
    setStatus('knowledgeStatus',`Importação concluída: ${result.importedDocs} arquivo(s), ${result.importedChunks} chunk(s), ${result.skipped.length} ignorado(s).`);
    await refreshKnowledgeStats();
    if(typeof toast==='function') toast('Base local importada para o APK.');
  }
  async function searchKnowledge(){
    const query=q('knowledgeSearchInput')?.value?.trim();
    if(!query) return setStatus('knowledgeStatus','Digite uma busca.');
    const box=q('knowledgeResults');
    if(box) box.innerHTML='<p class="status">Buscando offline...</p>';
    const results=await engine().searchKnowledge(query,{limit:12});
    if(!box) return;
    if(!results.length){ box.innerHTML='<p class="status">Nada encontrado na base local.</p>'; return; }
    box.innerHTML=results.map((r,i)=>`<div class="rag-result-card"><strong>${i+1}. ${esc(r.path||r.name||'fonte local')}</strong><small>score ${Number(r._score||0).toFixed(1)} · ${esc(r.projectId||'apk-local')}</small><pre>${esc(String(r.text||'').slice(0,900))}</pre></div>`).join('');
  }
  async function exportKnowledge(){
    const data=await engine().exportKnowledge();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='gitfusion-knowledge-backup.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    setStatus('knowledgeStatus','Backup exportado.');
  }
  async function restoreKnowledge(file){
    if(!file) return;
    const text=await file.text();
    const data=JSON.parse(text);
    const stats=await engine().importKnowledgeBackup(data);
    setStatus('knowledgeStatus',`Backup restaurado: ${stats.docs} arquivo(s), ${stats.chunks} chunk(s).`);
  }
  function loadRuntimeSettings(){
    const cfg=engine()?.settings?.() || {};
    if(q('ollamaUrlInput')) q('ollamaUrlInput').value=cfg.ollamaUrl||'http://127.0.0.1:11434';
    if(q('ollamaModelInput')) q('ollamaModelInput').value=cfg.ollamaModel||'tinyllama';
    if(q('onlineBaseUrlInput')) q('onlineBaseUrlInput').value=cfg.onlineBaseUrl||'';
    if(q('onlineModelInput')) q('onlineModelInput').value=cfg.onlineModel||'gpt-4o-mini';
    if(q('onlineTokenInput')) q('onlineTokenInput').value=cfg.onlineToken||'';
  }
  async function saveRuntimeSettings(){
    engine()?.saveSettings?.({
      ollamaUrl:q('ollamaUrlInput')?.value?.trim() || 'http://127.0.0.1:11434',
      ollamaModel:q('ollamaModelInput')?.value?.trim() || 'tinyllama',
      onlineBaseUrl:q('onlineBaseUrlInput')?.value?.trim() || '',
      onlineModel:q('onlineModelInput')?.value?.trim() || 'gpt-4o-mini',
      onlineToken:q('onlineTokenInput')?.value?.trim() || ''
    });
    setStatus('runtimeSettingsStatus','Motores salvos no aparelho.');
  }
  async function testOllama(){
    await saveRuntimeSettings();
    setStatus('runtimeSettingsStatus','Testando Ollama...');
    const r=await engine().probeOllama();
    setStatus('runtimeSettingsStatus', r.available ? `Ollama ativo: ${r.models.join(', ')||'sem modelos listados'}` : `Ollama indisponível: ${r.error}`);
  }
  document.addEventListener('click',async(e)=>{
    if(e.target.closest('#chooseKnowledgeFiles')){ q('knowledgeFilePicker')?.click(); return; }
    if(e.target.closest('#knowledgeSearchBtn')){ await searchKnowledge(); return; }
    if(e.target.closest('#refreshKnowledgeStats')){ await refreshKnowledgeStats(); return; }
    if(e.target.closest('#clearKnowledgeBase')){ if(confirm('Limpar toda a base local importada?')){ await engine().clearKnowledge(); await refreshKnowledgeStats(); q('knowledgeResults').innerHTML='<p class="status">Base local limpa.</p>'; } return; }
    if(e.target.closest('#exportKnowledgeBase')){ await exportKnowledge(); return; }
    if(e.target.closest('#importKnowledgeBackup')){ q('knowledgeBackupPicker')?.click(); return; }
    if(e.target.closest('#saveRuntimeSettings')){ await saveRuntimeSettings(); return; }
    if(e.target.closest('#testOllamaRuntime')){ await testOllama(); return; }
  });
  document.addEventListener('change',async(e)=>{
    if(e.target.id==='knowledgeFilePicker'){ await importSelectedFiles(e.target.files); e.target.value=''; }
    if(e.target.id==='knowledgeBackupPicker'){ await restoreKnowledge(e.target.files?.[0]); e.target.value=''; }
  });
  document.addEventListener('keydown',async(e)=>{ if(e.target?.id==='knowledgeSearchInput' && e.key==='Enter') await searchKnowledge(); });
  window.addEventListener('load',()=>{ loadRuntimeSettings(); refreshKnowledgeStats(); });
  const oldGo=window.go;
  if(typeof oldGo==='function') window.go=function(page){ const out=oldGo(page); if(page==='connectivity') setTimeout(loadRuntimeSettings,40); if(page==='memory') setTimeout(refreshKnowledgeStats,80); return out; };
})();
