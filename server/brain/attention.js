import { tokens } from './utils.js';

const urgencyWords = ['erro','falha','quebrou','travou','urgente','agora','não aparece','sumiu','crash','failure'];
const creationWords = ['criar','construir','gerar','implementar','mesclar','integrar','rodar','publicar'];
const riskWords = ['apagar','delete','rm -rf','token','senha','secret','push','chmod','sudo'];

export function computeAttention(signal = {}, perception = {}) {
  const text = String(signal.content || '').toLowerCase();
  const t = tokens(text);
  const urgency = urgencyWords.some(w => text.includes(w)) ? 0.85 : 0.35;
  const creation = creationWords.some(w => text.includes(w)) ? 0.75 : 0.3;
  const risk = riskWords.some(w => text.includes(w)) || perception.risk === 'high' ? 0.95 : perception.risk === 'medium' ? 0.65 : 0.2;
  const novelty = Math.min(1, Math.max(0.2, t.length / 120));
  const importance = Math.min(1, (urgency * 0.25) + (creation * 0.25) + (risk * 0.25) + (novelty * 0.25));
  const neurotransmitters = {
    dopamine: creation > 0.5 ? 0.55 : 0.25,
    cortisol: risk,
    acetylcholine: importance,
    norepinephrine: urgency,
  };
  return {
    importance,
    urgency,
    novelty,
    risk,
    neurotransmitters,
    label: importance > 0.7 ? 'alta' : importance > 0.45 ? 'média' : 'baixa',
  };
}

export function attentionSummary(attention) {
  return `Atenção ${attention.label}: importância ${Math.round(attention.importance * 100)}%, risco ${Math.round(attention.risk * 100)}%, novidade ${Math.round(attention.novelty * 100)}%.`;
}
