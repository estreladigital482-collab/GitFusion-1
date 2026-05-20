import fs from 'fs-extra';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from '../config.js';
import { tree } from './repositories.js';

const exec = promisify(execFile);

function authHeaders(token){
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'GitFusion/0.1.22'
  };
}
export function cleanRepoName(name='gitfusion-project'){
  return String(name).trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,96) || 'gitfusion-project';
}
export function projectDir(projectId){ return path.join(config.workspaceDir, projectId); }
export async function githubMe(token){
  if(!token) throw new Error('Token do GitHub não informado.');
  const res = await fetch('https://api.github.com/user', { headers: authHeaders(token) });
  if(!res.ok) throw new Error(`GitHub recusou o token: HTTP ${res.status}`);
  return res.json();
}
export async function createRepo(token,{name,description='',privateRepo=true}){
  const repoName = cleanRepoName(name);
  const res = await fetch('https://api.github.com/user/repos', {
    method:'POST',
    headers: { ...authHeaders(token), 'Content-Type':'application/json' },
    body: JSON.stringify({ name: repoName, description, private: !!privateRepo, auto_init: false })
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok && res.status !== 422) throw new Error(data.message || `Erro ao criar repositório: HTTP ${res.status}`);
  if(res.status === 422){
    const me = await githubMe(token);
    return { name: repoName, owner: me.login, html_url:`https://github.com/${me.login}/${repoName}`, clone_url:`https://github.com/${me.login}/${repoName}.git`, existed:true };
  }
  return data;
}
async function git(args,cwd){
  try{
    const { stdout, stderr } = await exec('git', args, { cwd, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
    return { ok:true, stdout, stderr };
  }catch(error){
    const msg = [error.stdout,error.stderr,error.message].filter(Boolean).join('\n');
    throw new Error(msg || 'Falha ao executar git.');
  }
}
export async function ensureGitRepo(dir, branch='main'){
  await fs.ensureDir(dir);
  if(!(await fs.pathExists(path.join(dir,'.git')))) await git(['init'], dir);
  await git(['checkout','-B',branch], dir);
  await git(['config','user.name','GitFusion'], dir).catch(()=>{});
  await git(['config','user.email','gitfusion@local.app'], dir).catch(()=>{});
}
export async function generateReadme(project, dir, extra={}){
  const nodes = await tree(dir).catch(()=>[]);
  const repos = (project?.repos||[]).map(r=>`- ${r.owner}/${r.repo} (${r.branch || 'main'})`).join('\n') || '- Nenhum repositório registrado.';
  const lines = [
    `# ${project?.name || extra.repoName || 'Projeto GitFusion'}`,
    '',
    project?.description || extra.description || 'Projeto gerado e mesclado com GitFusion.',
    '',
    '## Repositórios de origem',
    repos,
    '',
    '## Estrutura inicial',
    '```txt',
    ...nodes.slice(0,40).map(n=>`${n.type==='dir'?'📁':'📄'} ${n.path || n.name}`),
    '```',
    '',
    '## Como usar',
    'Revise as dependências, escolha a stack principal e execute os comandos de instalação/build conforme o projeto base.',
    '',
    '## Gerado por',
    'GitFusion'
  ];
  await fs.writeFile(path.join(dir,'README.md'), lines.join('\n'), 'utf8');
}
export async function generateTasks(project, dir){
  const tasks = [
    '# TASKS.md', '',
    '- [ ] Revisar estrutura mesclada',
    '- [ ] Conferir conflitos de dependências',
    '- [ ] Definir projeto base',
    '- [ ] Testar instalação',
    '- [ ] Testar build',
    '- [ ] Revisar README',
    '- [ ] Publicar release inicial'
  ];
  await fs.writeFile(path.join(dir,'TASKS.md'), tasks.join('\n'), 'utf8');
}
export async function publishProject({ token, project, projectId, repoName, description, privateRepo=true, branch='main', includeReadme=true, includeTasks=true }){
  if(!token) throw new Error('Token do GitHub não informado.');
  const dir = projectDir(projectId);
  if(!(await fs.pathExists(dir))) throw new Error('Pasta do projeto não encontrada.');
  const repo = await createRepo(token,{ name: repoName || project?.name || projectId, description, privateRepo });
  if(includeReadme) await generateReadme(project, dir, { repoName, description });
  if(includeTasks) await generateTasks(project, dir);
  await ensureGitRepo(dir, branch);
  await git(['add','.'], dir);
  const status = await git(['status','--porcelain'], dir);
  if(status.stdout.trim()) await git(['commit','-m','Initial GitFusion publish'], dir);
  const remoteUrl = `https://x-access-token:${encodeURIComponent(token)}@github.com/${repo.owner?.login || repo.owner}/${repo.name}.git`;
  await git(['remote','remove','origin'], dir).catch(()=>{});
  await git(['remote','add','origin',remoteUrl], dir);
  await git(['push','-u','origin',branch], dir);
  await git(['remote','set-url','origin',`https://github.com/${repo.owner?.login || repo.owner}/${repo.name}.git`], dir).catch(()=>{});
  return { ok:true, repo:{ name: repo.name, owner: repo.owner?.login || repo.owner, url: repo.html_url || `https://github.com/${repo.owner?.login || repo.owner}/${repo.name}` }, branch };
}
export async function pullProject({ projectId, branch='main' }){
  const dir = projectDir(projectId);
  await ensureGitRepo(dir, branch);
  return git(['pull','--ff-only','origin',branch], dir);
}
export async function listBranches(projectId){
  const dir = projectDir(projectId);
  if(!(await fs.pathExists(path.join(dir,'.git')))) return { branches:[], current:null };
  const out = await git(['branch','--list'], dir);
  const branches = out.stdout.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>({ name:l.replace(/^\*\s*/,''), current:l.startsWith('*') }));
  return { branches, current:branches.find(b=>b.current)?.name || null };
}
export async function createBranch(projectId, name){
  const branch = cleanRepoName(name || 'feature/gitfusion');
  const dir = projectDir(projectId);
  await ensureGitRepo(dir);
  await git(['checkout','-B',branch], dir);
  return { branch };
}
