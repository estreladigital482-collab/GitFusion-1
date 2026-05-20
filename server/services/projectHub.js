import fs from 'fs-extra';
import path from 'path';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { readJson, writeJson } from './store.js';
import { createTask, listTasks } from './tasks.js';
import { addMemory, listMemory, ensureVault } from './memory.js';
import { getWiki, saveWikiPage } from './wiki.js';

function safeId(input=''){
  return String(input || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g,'-')
    .replace(/(^-|-$)/g,'')
    .slice(0,90) || `project-${nanoid(8)}`;
}
function now(){ return new Date().toISOString(); }
function projectPath(id){ return path.join(config.dataDir,'projects',`${safeId(id)}.json`); }
function chatsPath(projectId){ return path.join(config.dataDir,'project-chats',`${safeId(projectId)}.json`); }
function eventsPath(projectId){ return path.join(config.dataDir,'project-events',`${safeId(projectId)}.json`); }
function workspacePath(projectId){ return path.join(config.workspaceDir, safeId(projectId)); }

async function readProject(projectId){
  return fs.readJson(projectPath(projectId)).catch(()=>null);
}
async function writeProject(project){
  await fs.ensureDir(path.dirname(projectPath(project.id)));
  await fs.writeJson(projectPath(project.id), project, { spaces: 2 });
  return project;
}
async function appendProjectEvent(projectId, event){
  const id=safeId(projectId);
  await fs.ensureDir(path.dirname(eventsPath(id)));
  const db=await fs.readJson(eventsPath(id)).catch(()=>({projectId:id,events:[]}));
  db.events=[{id:nanoid(10), at:now(), ...event}, ...(db.events||[])].slice(0,200);
  await fs.writeJson(eventsPath(id), db, {spaces:2});
  return db.events[0];
}

export async function ensureProjectSystem(projectId, defaults={}){
  const id=safeId(projectId || defaults.name || `project-${Date.now()}`);
  let project=await readProject(id);
  if(!project){
    project={
      id,
      jobId:id,
      name: defaults.name || id,
      status: defaults.status || 'active',
      kind:'intelligent-project',
      progress: Number(defaults.progress || 0),
      repos: defaults.repos || [],
      createdAt: now(),
      updatedAt: now(),
      stats:{ chats:0, tasks:0, memories:0, wikiPages:0, files:0 },
      settings:{ isolatedMemory:true, isolatedWiki:true, isolatedChats:true }
    };
    await fs.ensureDir(workspacePath(id));
    await ensureVault(id);
    await writeProject(project);
    await saveWikiPage(id,'home',`# ${project.name}\n\nProjeto inteligente criado pelo GitFusion.\n\n## Espaços\n- Chats separados\n- Tasks separadas\n- Memória separada\n- Wiki separada\n- Workspace próprio\n`,'Home');
    await addMemory(id,{title:'Projeto criado',body:`Projeto ${project.name} inicializado com memória, wiki, tasks e chats isolados.`,tags:['project','init'],source:'project-hub'});
    await appendProjectEvent(id,{type:'project:create',message:'Projeto inteligente criado.'});
  } else {
    project={...project, kind:project.kind || 'intelligent-project', settings: project.settings || {isolatedMemory:true, isolatedWiki:true, isolatedChats:true}};
    await writeProject(project);
  }
  return refreshProjectStats(id);
}

export async function listProjectChats(projectId){
  const id=safeId(projectId);
  await fs.ensureDir(path.dirname(chatsPath(id)));
  const db=await fs.readJson(chatsPath(id)).catch(()=>({projectId:id,chats:[]}));
  return db.chats || [];
}

export async function createProjectChat(projectId, input={}){
  const project=await ensureProjectSystem(projectId,{name:input.projectName});
  const idProject=project.id;
  const db=await fs.readJson(chatsPath(idProject)).catch(()=>({projectId:idProject,chats:[]}));
  const chat={
    id: input.id || `chat-${nanoid(10)}`,
    projectId:idProject,
    title: input.title || 'Novo chat do projeto',
    messages: Array.isArray(input.messages) ? input.messages : [{role:'ai', text:'Chat conectado ao projeto. Tudo aqui fica na memória deste projeto.'}],
    createdAt:now(),
    updatedAt:now()
  };
  db.chats=[chat, ...(db.chats||[])].filter((c,i,arr)=>arr.findIndex(x=>x.id===c.id)===i);
  await fs.writeJson(chatsPath(idProject), db, {spaces:2});
  await appendProjectEvent(idProject,{type:'chat:create',message:`Chat criado: ${chat.title}`, chatId:chat.id});
  await addMemory(idProject,{title:`Chat criado: ${chat.title}`, body:`Chat ${chat.id} criado dentro do projeto ${project.name}.`, tags:['chat'], source:'project-hub'});
  return { project: await refreshProjectStats(idProject), chat };
}

export async function addProjectChatMessage(projectId, chatId, message={}){
  const id=safeId(projectId);
  const db=await fs.readJson(chatsPath(id)).catch(()=>({projectId:id,chats:[]}));
  const chat=(db.chats||[]).find(c=>c.id===chatId);
  if(!chat) throw new Error('Chat do projeto não encontrado.');
  chat.messages=chat.messages || [];
  chat.messages.push({ role:message.role || 'user', text:String(message.text || ''), at:now() });
  chat.updatedAt=now();
  await fs.writeJson(chatsPath(id), db, {spaces:2});
  await appendProjectEvent(id,{type:'chat:message',message:`Mensagem adicionada em ${chat.title}`, chatId});
  if(message.remember!==false){
    await addMemory(id,{title:`Mensagem: ${chat.title}`, body:String(message.text || '').slice(0,4000), tags:['chat','message'], source:'project-chat'});
  }
  return chat;
}

async function countFiles(dir){
  let count=0;
  if(!(await fs.pathExists(dir))) return 0;
  for(const item of await fs.readdir(dir)){
    const full=path.join(dir,item);
    const stat=await fs.stat(full).catch(()=>null);
    if(!stat) continue;
    if(stat.isDirectory()) count += await countFiles(full);
    else count += 1;
  }
  return count;
}

export async function refreshProjectStats(projectId){
  const id=safeId(projectId);
  let project=await readProject(id);
  if(!project) return null;
  const chats=await listProjectChats(id);
  const tasks=await listTasks(id).catch(()=>[]);
  const memories=await listMemory(id).catch(()=>[]);
  const wiki=await getWiki(id).catch(()=>({pages:[]}));
  project.stats={
    chats: chats.length,
    tasks: tasks.length,
    memories: memories.length,
    wikiPages: (wiki.pages||[]).length,
    files: await countFiles(workspacePath(id))
  };
  project.updatedAt=now();
  await writeProject(project);
  return project;
}

export async function getProjectDashboard(projectId){
  const project=await refreshProjectStats(projectId);
  if(!project) return null;
  const chats=await listProjectChats(project.id);
  const tasks=await listTasks(project.id).catch(()=>[]);
  const memories=await listMemory(project.id).catch(()=>[]);
  const wiki=await getWiki(project.id).catch(()=>({pages:[]}));
  const events=await fs.readJson(eventsPath(project.id)).catch(()=>({events:[]}));
  return {
    project,
    chats: chats.map(c=>({...c, messageCount:(c.messages||[]).length, lastMessage:(c.messages||[]).slice(-1)[0]||null, messages:undefined})),
    tasks,
    memories: memories.slice(0,20).map(m=>({slug:m.slug,title:m.title,tags:m.tags,updatedAt:m.updatedAt})),
    wiki: {title:wiki.title, pages:wiki.pages||[], updatedAt:wiki.updatedAt},
    events: events.events || []
  };
}

export async function bootstrapProjectFromPrompt(input={}){
  const name=input.name || 'Novo projeto GitFusion';
  const project=await ensureProjectSystem(safeId(name),{name, repos:input.repos||[]});
  const firstChat=await createProjectChat(project.id,{title:'Planejamento inicial',messages:[{role:'ai',text:`Projeto ${name} criado. Vou manter chats, tarefas, memória e wiki separados para este projeto.`}]});
  await createTask(project.id,{title:'Definir objetivo do projeto',description:input.goal || 'Descrever objetivo principal e critérios de pronto.',estimateMinutes:10,status:'pending_approval'});
  await createTask(project.id,{title:'Mapear arquivos e dependências',description:'Analisar workspace, stack e pontos sensíveis antes de executar mudanças.',estimateMinutes:15,status:'pending_approval'});
  await saveWikiPage(project.id,'objetivo',`# Objetivo\n\n${input.goal || 'Objetivo ainda não detalhado.'}\n\n## Critérios\n- Rodar no celular\n- Manter memória do projeto\n- Permitir execução segura por etapas\n`,'Objetivo');
  await appendProjectEvent(project.id,{type:'project:bootstrap',message:'Projeto inicializado com chat, tasks e wiki.'});
  return getProjectDashboard(project.id);
}
