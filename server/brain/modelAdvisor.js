export function getFreeMobileModelPlan() {
  return {
    goal: 'Rodar o GitFusion com IA gratuita e leve no Android/Termux.',
    primary: [
      model('qwen2.5-coder:0.5b', 'Código leve', 'Mais indicado para celular fraco/médio.'),
      model('qwen2.5-coder:1.5b', 'Código melhor', 'Tente se o aparelho tiver mais RAM.'),
      model('tinyllama:1.1b', 'Teste rápido', 'Bom para validar fluxo, fraco para código complexo.'),
      model('deepseek-coder:1.3b', 'Código', 'Pode ser mais pesado no Android, use como opcional.')
    ],
    architecture: [
      'RAG/MemPalace sempre antes do modelo.',
      'Tasks pequenas para reduzir contexto.',
      'Execução supervisionada no terminal.',
      'Dataset local para LoRA futuro.',
      'Fallback simbólico quando o modelo local não responder.'
    ],
    termuxNotes: [
      'Ollama pode não funcionar em todos os aparelhos Android.',
      'llama.cpp/MLC/servidor remoto gratuito podem entrar como alternativas futuras.',
      'Não dependa de modelo grande no celular; dependa de memória boa e plano por etapas.'
    ]
  };
}

function model(id, role, note) { return { id, role, note, free: true, localFirst: true }; }
