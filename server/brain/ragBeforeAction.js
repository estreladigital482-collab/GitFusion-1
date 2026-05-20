import { searchPalace } from './memPalace.js';

export async function buildActionContext({ prompt = '', memorySearch, wikiSearch, projectSearch }) {
  const [palace, memory, wiki, projects] = await Promise.all([
    searchPalace(prompt),
    typeof memorySearch === 'function' ? memorySearch(prompt) : [],
    typeof wikiSearch === 'function' ? wikiSearch(prompt) : [],
    typeof projectSearch === 'function' ? projectSearch(prompt) : []
  ]);

  const blocks = [];
  if (palace.length) blocks.push(format('MemPalace', palace));
  if (memory?.length) blocks.push(format('Memória', memory));
  if (wiki?.length) blocks.push(format('Wiki', wiki));
  if (projects?.length) blocks.push(format('Projetos', projects));

  return {
    sources: { palace, memory, wiki, projects },
    context: blocks.join('\n\n')
  };
}

function format(label, items) {
  return `### ${label}\n${items.slice(0, 8).map((item, index) => {
    const title = item.title || item.name || item.path || `item-${index + 1}`;
    const content = item.content || item.text || item.summary || '';
    return `- ${title}: ${String(content).slice(0, 420)}`;
  }).join('\n')}`;
}
