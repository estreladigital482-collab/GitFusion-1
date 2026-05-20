const base = process.env.GITFUSION_TEST_BASE || 'http://127.0.0.1:3737';
async function api(path, options){ const r = await fetch(base+path, { headers:{'content-type':'application/json'}, ...options }); if(!r.ok) throw new Error(await r.text()); return r.json(); }
const stamp = Date.now();
const file = `selftest/session-15-9-${stamp}.md`;
console.log('Criando pasta...');
await api('/api/workspace/folder', { method:'POST', body:JSON.stringify({ path:'selftest' }) });
console.log('Salvando arquivo...');
await api('/api/workspace/file', { method:'POST', body:JSON.stringify({ path:file, content:'# Workspace IDE selftest\n\nArquivo real criado pelo GitFusion.' }) });
console.log('Lendo arquivo...');
const read = await api('/api/workspace/file?path='+encodeURIComponent(file));
console.log({ path: read.path, bytes: read.size, ok: read.content.includes('Workspace IDE') });
console.log('Listando árvore...');
const tree = await api('/api/workspace/tree?maxDepth=4');
console.log({ active: tree.active?.name, size: tree.sizeLabel, root: tree.root });
