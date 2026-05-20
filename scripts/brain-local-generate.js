const base = process.env.GITFUSION_BASE_URL || 'http://127.0.0.1:3737';
const prompt = process.argv.slice(2).join(' ') || 'Teste rápido: explique o GitFusion em uma frase.';
const res = await fetch(`${base}/api/brain/local/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt })
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
