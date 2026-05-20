const base = process.env.GITFUSION_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3737}`;
async function main(){
  const event = await fetch(`${base}/api/brain/learning/event`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ runId:'selftest', projectId:'selftest', intent:'debug', prompt:'teste de aprendizado', actions:[{type:'write_file'}], result:{ok:true, summary:'funcionou'}, provider:'gitfusion', model:'learning-selftest' })
  }).then(r=>r.json());
  const summary = await fetch(`${base}/api/brain/learning/summary?projectId=selftest`).then(r=>r.json());
  const suggestions = await fetch(`${base}/api/brain/learning/suggest`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectId:'selftest', intent:'debug' }) }).then(r=>r.json());
  console.log(JSON.stringify({ event, summary, suggestions }, null, 2));
}
main().catch(err => { console.error(err); process.exit(1); });
