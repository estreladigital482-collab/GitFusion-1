const base='http://127.0.0.1:3737';
async function j(path, options={}){
  const res=await fetch(base+path,{headers:{'content-type':'application/json'},...options});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
const name='selftest-project-'+Date.now();
const created=await j('/api/projects/smart',{method:'POST',body:JSON.stringify({name,goal:'Validar projeto inteligente no celular'})});
console.log('created', created.project.id, created.project.stats);
const chat=await j(`/api/projects/${created.project.id}/chats`,{method:'POST',body:JSON.stringify({title:'Teste real'})});
console.log('chat', chat.chat.id);
await j(`/api/projects/${created.project.id}/chats/${chat.chat.id}/messages`,{method:'POST',body:JSON.stringify({role:'user',text:'Mensagem de teste persistida na memória do projeto.'})});
const dashboard=await j(`/api/projects/${created.project.id}/dashboard`);
console.log(JSON.stringify({project:dashboard.project.name, stats:dashboard.project.stats, chats:dashboard.chats.length, tasks:dashboard.tasks.length, memories:dashboard.memories.length},null,2));
