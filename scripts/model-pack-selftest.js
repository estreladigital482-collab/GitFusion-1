import fs from 'node:fs';
const registry = JSON.parse(fs.readFileSync('public/ai-pack-registry.json','utf8'));
const needed = ['qwen25-coder-15b-q4km','deepseek-coder-13b-q4km','tinyllama-chat-q4km'];
const ids = registry.models.map(m=>m.id);
for (const id of needed) if (!ids.includes(id)) throw new Error(`Modelo ausente: ${id}`);
for (const m of registry.models) {
  if (!m.hfUrl || !m.ollamaRef || !m.filename) throw new Error(`Modelo incompleto: ${m.id}`);
}
console.log('AI Pack registry ok:', registry.models.length, 'modelos ·', registry.models.reduce((a,m)=>a+Number(m.sizeBytes||0),0), 'bytes planejados');
