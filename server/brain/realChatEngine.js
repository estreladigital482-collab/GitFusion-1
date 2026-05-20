import { nanoid } from 'nanoid';
import { askAI, aiStatus } from '../services/ai.js';
import { connectivityStatus, getNetworkMode } from '../services/connectivity.js';
import { ragContext } from '../services/rag.js';
import { createTask } from '../services/tasks.js';
import { writeJson, readJson } from '../services/store.js';

const liveRuns = new Map();

function now(){ return new Date().toISOString(); }
function clamp(n){ return Math.max(0, Math.min(100, Number(n || 0))); }

function detectIntent(text=''){
  const t = text.toLowerCase();
  if(/(juntar|mesclar|merge|unir|combinar).*repo|reposit/.test(t)) return 'merge-projects';
  if(/(criar|gerar|fazer|implementar|programar|codar)/.test(t)) return 'code-task';
  if(/(erro|bug|falha|não funciona|nao funciona|corrigir|consertar)/.test(t)) return 'debug';
  if(/(analisa|analisar|explique|explica|revisar|verifica)/.test(t)) return 'analysis';
  if(/(apk|android|capacitor|gradle|termux)/.test(t)) return 'android-build';
  return 'chat';
}

function taskPlanFor(intent, prompt=''){
  const common = [
    { id:'receive', title:'Ler pedido', status:'pending', percent:12 },
    { id:'mode', title:'Verificar modo Auto/Online/Offline', status:'pending', percent:24 },
    { id:'rag', title:'Consultar memória/RAG local', status:'pending', percent:38 },
  ];
  const byIntent = {
    'merge-projects': [
      { id:'repos', title:'Identificar repositórios e conflitos', status:'pending', percent:52 },
      { id:'merge-plan', title:'Criar plano real de mesclagem', status:'pending', percent:72 },
      { id:'safe-actions', title:'Gerar ações seguras para workspace', status:'pending', percent:90 },
    ],
    'code-task': [
      { id:'files', title:'Mapear arquivos que precisam mudar', status:'pending', percent:56 },
      { id:'implementation', title:'Planejar implementação', status:'pending', percent:76 },
      { id:'validation', title:'Definir testes/verificação', status:'pending', percent:92 },
    ],
    'debug': [
      { id:'error', title:'Isolar erro principal', status:'pending', percent:54 },
      { id:'cause', title:'Apontar causa provável', status:'pending', percent:74 },
      { id:'fix', title:'Propor correção verificável', status:'pending', percent:92 },
    ],
    'android-build': [
      { id:'env', title:'Ler ambiente Android/Termux', status:'pending', percent:54 },
      { id:'compat', title:'Checar compatibilidade SDK/Gradle/Capacitor', status:'pending', percent:74 },
      { id:'apk', title:'Gerar próximos comandos para APK', status:'pending', percent:92 },
    ],
    'analysis': [
      { id:'context', title:'Organizar contexto encontrado', status:'pending', percent:60 },
      { id:'answer', title:'Responder com conclusão e próximos passos', status:'pending', percent:92 },
    ],
    'chat': [
      { id:'answer', title:'Responder diretamente', status:'pending', percent:92 },
    ]
  };
  return [...common, ...(byIntent[intent] || byIntent.chat), { id:'done', title:'Finalizar resposta', status:'pending', percent:100 }]
    .map((s, index)=>({ ...s, index:index+1, estimateMinutes: index < 3 ? 1 : 2 }));
}

function localHonestAnswer({ prompt, status, rag, mode, intent }){
  const ai = status?.ai || {};
  const local = ai.local || {};
  const online = ai.online || {};
  const noEngine = !ai.ready;
  const bits = [];
  bits.push(`Entendi seu pedido: ${prompt}`);
  bits.push('');
  if(noEngine){
    bits.push('Estado real do motor: ainda não existe modelo de IA ativo conectado.');
    bits.push(`Modo atual: ${mode.mode}. Efetivo: ${status.effectiveMode}.`);
    bits.push(`Online configurado: ${online.available ? 'sim' : 'não'}. Local/Ollama: ${local.available ? 'sim' : 'não'}.`);
    bits.push('');
    bits.push('Eu não vou fingir que sou um LLM aqui. Posso operar como motor local de projeto: criar plano, tasks, ler RAG/memória, preparar comandos e acionar executor seguro. Para conversa inteligente de verdade, conecte uma API online ou um modelo local Ollama.');
  } else {
    bits.push('Motor detectado e pronto. Vou usar o provedor disponível para responder e agir com segurança.');
  }
  if(rag?.context){
    bits.push('');
    bits.push('Contexto local encontrado:');
    bits.push(rag.context.slice(0, 900));
  }
  bits.push('');
  bits.push('Próximo passo prático:');
  if(intent === 'android-build') bits.push('1. Conferir SDK/Capacitor/Gradle. 2. Ajustar versões. 3. Gerar app-debug.apk.');
  else if(intent === 'merge-projects') bits.push('1. Enviar os repositórios. 2. Analisar árvore. 3. Criar plano de mesclagem. 4. Executar no workspace com backup.');
  else if(intent === 'code-task') bits.push('1. Mapear arquivos. 2. Criar patch. 3. Salvar backup. 4. Testar.');
  else bits.push('Me mande o objetivo exato, arquivos/repositórios ou erro, e eu transformo em tasks executáveis.');
  return bits.join('\n');
}

async function persistRun(run){
  await writeJson('brain-chat-runs', run.id, run);
  await writeJson('brain-chat-runs', 'latest', { id: run.id, updatedAt: now() });
}

export async function startRealChat(input={}){
  const prompt = String(input.prompt || '').trim();
  if(!prompt) throw new Error('Mensagem vazia.');
  const id = `chat_${Date.now()}_${nanoid(6)}`;
  const intent = detectIntent(prompt);
  const steps = taskPlanFor(intent, prompt);
  const run = {
    id,
    ok: true,
    createdAt: now(),
    updatedAt: now(),
    status: 'running',
    prompt,
    chatId: input.chatId || 'main',
    projectId: input.projectId || 'general',
    mode: 'auto',
    intent,
    progress: 3,
    current: 'Iniciando motor real do GitFusion',
    estimateMinutes: Math.max(1, Math.ceil(steps.length / 3)),
    steps,
    events: [{ at: now(), percent: 3, title: 'Iniciando motor real do GitFusion' }],
    provider: 'pending',
    model: 'pending',
    answer: ''
  };
  liveRuns.set(id, run);
  persistRun(run).catch(()=>{});
  process.nextTick(()=>executeRealChatRun(id, input).catch(error=>{
    const r=liveRuns.get(id);
    if(r){ r.status='failed'; r.error=error.message; r.current='Falha no motor'; r.updatedAt=now(); persistRun(r).catch(()=>{}); }
  }));
  return run;
}

async function mark(run, stepId, status, current){
  const s = run.steps.find(x=>x.id===stepId);
  if(s){ s.status=status; run.progress = clamp(Math.max(run.progress, s.percent)); }
  run.current = current || s?.title || run.current;
  run.updatedAt = now();
  run.events.push({ at: now(), percent: run.progress, title: run.current });
  liveRuns.set(run.id, run);
  await persistRun(run).catch(()=>{});
}

async function delay(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function executeRealChatRun(id, input){
  const run = liveRuns.get(id);
  if(!run) return;
  await delay(250); await mark(run, 'receive', 'done', 'Pedido recebido e classificado');
  const mode = await getNetworkMode().catch(()=>({ mode:'auto' }));
  const conn = await connectivityStatus().catch(error=>({ mode:mode.mode, effectiveMode:mode.mode, ai:{ ready:false, error:error.message }}));
  run.mode = conn.effectiveMode || mode.mode || 'auto';
  await delay(250); await mark(run, 'mode', 'done', `Modo ativo: ${mode.mode} → ${run.mode}`);
  const rag = await ragContext(run.prompt, { projectId: run.projectId, limit: 6 }).catch(()=>({ context:'', sources:[] }));
  run.contextSources = rag.sources || [];
  await delay(350); await mark(run, 'rag', 'done', rag.context ? 'Memória/RAG local encontrado' : 'Sem contexto local relevante');

  for(const s of run.steps.filter(x=>!['receive','mode','rag','done'].includes(x.id))){
    await delay(220);
    await mark(run, s.id, 'running', s.title);
    try {
      if(['merge-plan','implementation','fix','apk','answer'].includes(s.id)){
        await createTask(run.projectId, { title:s.title, description:`Criado pelo chat real para: ${run.prompt}`, status:'planned', progress:0, estimateMinutes:s.estimateMinutes }).catch(()=>{});
      }
    } catch {}
    await delay(180);
    await mark(run, s.id, 'done', `${s.title} concluído`);
  }

  const messages = [
    { role:'system', content:'Você é o GitFusion Brain real. Seja honesto. Não finja capacidade inexistente. Se não houver modelo online/local configurado, diga isso claramente e entregue plano operacional verificável.' },
    { role:'user', content: run.prompt }
  ];
  let ai;
  try {
    ai = await askAI(messages, { prompt:run.prompt, projectId:run.projectId });
  } catch(error){
    ai = { provider:'gitfusion-local-fallback', model:'none', error:error.message, content:'' };
  }
  const ready = ai.provider && !['gitfusion-local-fallback','internal'].includes(ai.provider) && !ai.error;
  run.provider = ai.provider || 'gitfusion-local-fallback';
  run.model = ai.model || 'none';
  run.usedRag = Boolean(ai.usedRag || rag.context);
  run.answer = ready ? ai.content : localHonestAnswer({ prompt:run.prompt, status:conn, rag, mode, intent:run.intent });
  if(ai.error) run.engineError = ai.error;
  await mark(run, 'done', 'done', 'Resposta final gerada');
  run.progress = 100;
  run.status = 'completed';
  run.updatedAt = now();
  await persistRun(run);
  liveRuns.set(run.id, run);
}

export async function getRealChatRun(id){
  if(liveRuns.has(id)) return liveRuns.get(id);
  return readJson('brain-chat-runs', id, null);
}

export async function getRealChatEngineStatus(){
  const conn = await connectivityStatus().catch(error=>({ ok:false, error:error.message }));
  return { ok:true, engine:'real-chat', connectivity:conn, activeRuns:liveRuns.size, updatedAt:now() };
}
