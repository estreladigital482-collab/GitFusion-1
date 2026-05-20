import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';

const DEFAULT_MODEL_CANDIDATES = [
  'qwen2.5-coder:7b',
  'qwen2.5-coder:3b',
  'deepseek-coder:6.7b',
  'codegemma:7b',
  'phi3:mini'
];

function now(){ return new Date().toISOString(); }
function compactText(input, limit=12000){ return String(input || '').replace(/\r/g,'').slice(0, limit); }
function unique(items){ return [...new Set(items.filter(Boolean))]; }
function jsonLine(obj){ return JSON.stringify(obj).replace(/\n/g,' ') + '\n'; }
function run(cmd,args,opts={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(cmd,args,{...opts,stdio:['ignore','pipe','pipe']});
    let out='',err='';
    child.stdout.on('data',d=>out+=d);
    child.stderr.on('data',d=>err+=d);
    child.on('error',reject);
    child.on('close',code=> code===0?resolve({out,err}):reject(new Error(err||out||`${cmd} falhou`)));
  });
}

export class GitFusionCore {
  constructor({root, workRoot}){
    this.root = root;
    this.workRoot = workRoot;
    this.memoryDir = path.join(root, 'data', 'model-memory');
    this.memoryFile = path.join(this.memoryDir, 'memory.jsonl');
    this.profileFile = path.join(this.memoryDir, 'profile.json');
  }

  async ensure(){
    await fs.mkdir(this.memoryDir, {recursive:true});
    await fs.mkdir(this.workRoot, {recursive:true});
  }

  async status(){
    await this.ensure();
    const local = await this.detectOllama();
    const memory = await this.readMemory(20);
    return {
      name: 'GitFusion',
      type: 'hybrid-agent-model',
      online: Boolean(process.env.GITFUSION_AI_TOKEN || process.env.KIMI_API_KEY || process.env.OPENAI_API_KEY),
      local,
      memoryItems: memory.length,
      capabilities: [
        'repo_reading',
        'architecture_planning',
        'fusion_strategy',
        'safe_file_generation',
        'local_memory_learning',
        'ollama_local_model',
        'openai_compatible_online_model'
      ]
    };
  }

  async detectOllama(){
    try{
      const r = await fetch('http://127.0.0.1:11434/api/tags', {signal: AbortSignal.timeout(2500)});
      const data = await r.json().catch(()=>({}));
      const models = (data.models || []).map(m=>m.name);
      return {available:r.ok, url:'http://127.0.0.1:11434', models, preferred:this.pickModel(models)};
    }catch(e){
      return {available:false, url:'http://127.0.0.1:11434', models:[], preferred:'qwen2.5-coder:7b', note:'Ollama não detectado'};
    }
  }

  pickModel(models=[]){
    for(const candidate of DEFAULT_MODEL_CANDIDATES){
      const found = models.find(m => m === candidate || m.startsWith(candidate.replace(':latest','')));
      if(found) return found;
    }
    return models[0] || DEFAULT_MODEL_CANDIDATES[0];
  }

  async readMemory(limit=80){
    await this.ensure();
    const raw = await fs.readFile(this.memoryFile, 'utf8').catch(()=> '');
    return raw.split('\n').filter(Boolean).slice(-limit).map(line=>{
      try{return JSON.parse(line)}catch{return {text:line}}
    });
  }

  async learn(event){
    await this.ensure();
    const record = {time:now(), ...event};
    await fs.appendFile(this.memoryFile, jsonLine(record));
    return record;
  }

  async summarizeRepos(repos=[]){
    return (repos||[]).map((r, i)=>({
      index:i,
      name: `${r.owner || ''}/${r.repo || r.name || ''}`.replace(/^\//,''),
      url:r.url || r.html || '',
      stack:r.stack || [],
      fileCount:r.fileCount || 0,
      branch:r.branch || 'unknown',
      files:(r.files || []).slice(0,50)
    }));
  }

  async makeSystem({memory=[], context={}}){
    const memories = memory.map(m=>`- ${m.kind||'memória'}: ${m.text||m.summary||JSON.stringify(m).slice(0,300)}`).join('\n');
    const repos = await this.summarizeRepos(context.repos || []);
    return `Você é o GitFusion: um modelo-agente de fusão de projetos.\n\nMissão:\n- Ler repositórios e entender arquitetura.\n- Planejar fusões de código com segurança.\n- Preservar projeto base e integrar doadores progressivamente.\n- Gerar tarefas, avisar riscos e produzir próximos passos claros.\n- Aprender com decisões locais usando memória JSONL, sem prometer treino de pesos.\n\nRegras:\n- Responda em português.\n- Seja direto, executor e prático.\n- Não invente que executou comandos se não executou.\n- Quando houver risco de sobrescrever arquivos, peça confirmação.\n- Prefira passos pequenos e verificáveis.\n\nMemória recente:\n${memories || '- vazia'}\n\nContexto de repositórios:\n${JSON.stringify(repos, null, 2)}\n\nLogs recentes:\n${JSON.stringify((context.logs||[]).slice(-40), null, 2)}`;
  }

  async callOllama({system, prompt}){
    const local = await this.detectOllama();
    if(!local.available) throw new Error('Ollama indisponível');
    const r = await fetch('http://127.0.0.1:11434/api/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model: local.preferred,
        stream:false,
        messages:[{role:'system', content:system}, {role:'user', content:prompt}],
        options:{temperature:0.2, num_ctx:8192}
      })
    });
    const data = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error || `Ollama HTTP ${r.status}`);
    return {provider:'ollama', model:local.preferred, answer:data.message?.content || data.response || ''};
  }

  async callOnline({system, prompt}){
    const baseUrl = process.env.GITFUSION_AI_BASE_URL || process.env.KIMI_BASE_URL || process.env.OPENAI_BASE_URL || '';
    const token = process.env.GITFUSION_AI_TOKEN || process.env.KIMI_API_KEY || process.env.OPENAI_API_KEY || '';
    const model = process.env.GITFUSION_AI_MODEL || process.env.KIMI_MODEL || process.env.OPENAI_MODEL || 'kimi-k2';
    if(!baseUrl || !token) throw new Error('API online não configurada');
    const r = await fetch(baseUrl.replace(/\/$/,'') + '/v1/chat/completions', {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      body:JSON.stringify({model, temperature:0.2, messages:[{role:'system',content:system},{role:'user',content:prompt}]})
    });
    const data = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error?.message || `HTTP ${r.status}`);
    return {provider:'openai-compatible', model, answer:data.choices?.[0]?.message?.content || ''};
  }

  localReasoner({prompt, context={}}){
    const repos = context.repos || [];
    const stacks = unique(repos.flatMap(r=>r.stack || []));
    const repoNames = repos.map(r=>`${r.owner||''}/${r.repo||r.name||''}`.replace(/^\//,'')).filter(Boolean);
    const lower = String(prompt||'').toLowerCase();
    let mode = 'planejamento';
    if(lower.includes('fund') || lower.includes('mescl') || lower.includes('merge') || lower.includes('fusão')) mode='fusão';
    if(lower.includes('erro') || lower.includes('corrig')) mode='correção';
    if(lower.includes('export') || lower.includes('zip') || lower.includes('apk')) mode='exportação';

    const answer = [
      `Entendi. Vou agir como GitFusion em modo de ${mode}.`,
      '',
      repos.length ? `Repositórios no contexto: ${repoNames.join(', ')}.` : 'Ainda não tenho repositórios analisados no contexto.',
      stacks.length ? `Stacks detectadas: ${stacks.join(', ')}.` : 'Stack ainda não detectada.',
      '',
      'Plano de ação:',
      '1. Validar repositórios e estrutura de pastas.',
      '2. Escolher uma base principal para não sobrescrever arquivos importantes.',
      '3. Importar os outros repositórios em uma área de fontes de fusão.',
      '4. Gerar relatório de conflitos, dependências e próximos passos.',
      '5. Exportar ZIP quando a fusão estiver segura.',
      '',
      'Ação recomendada agora: use Analisar real nos repositórios e depois peça “criar fusão segura”.'
    ].join('\n');
    return {provider:'gitfusion-local-reasoner', model:'gitfusion-rules+memory', answer};
  }

  async chat({prompt='', context={}, learn=true}){
    await this.ensure();
    const memory = await this.readMemory(60);
    const system = await this.makeSystem({memory, context});
    let result;
    try{
      result = await this.callOllama({system, prompt:compactText(prompt)});
    }catch(localErr){
      try{
        result = await this.callOnline({system, prompt:compactText(prompt)});
      }catch(onlineErr){
        result = this.localReasoner({prompt, context});
        result.fallback = {local:localErr.message, online:onlineErr.message};
      }
    }
    if(learn){
      await this.learn({
        kind:'chat',
        prompt:compactText(prompt,2000),
        summary:compactText(result.answer,2000),
        provider:result.provider,
        model:result.model,
        repos:(context.repos||[]).map(r=>r.url||`${r.owner}/${r.repo}`)
      });
    }
    return result;
  }

  async createTrainingExample({instruction='', input='', output='', tags=[]}){
    const record = await this.learn({kind:'training-example', instruction, input, output, tags});
    return record;
  }

  async exportDataset(){
    const memory = await this.readMemory(100000);
    return memory.filter(m=>m.kind === 'training-example' || m.kind === 'chat').map(m=>({
      messages:[
        {role:'system', content:'Você é o GitFusion, agente de fusão de repositórios.'},
        {role:'user', content:m.instruction || m.prompt || m.input || ''},
        {role:'assistant', content:m.output || m.summary || ''}
      ]
    }));
  }
}
