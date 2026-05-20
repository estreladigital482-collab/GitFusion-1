# GitFusion AI Brain Library

A IA local do GitFusion usa uma arquitetura inspirada no cérebro humano, mas implementada como software local-first.

## Ideia central

Cada informação importante vira um **neurônio de memória**:

- arquivo analisado;
- erro de build;
- decisão do usuário;
- solução encontrada;
- nota da Wiki;
- resposta útil;
- task aprovada;
- comando executado.

As conexões entre essas memórias viram **sinapses**. Cada sinapse tem peso. Uso frequente, sucesso e aprovação aumentam a força. Erros e rejeições reduzem confiança.

## Camadas

1. Entrada: receptores recebem sinais.
2. Percepção: classifica intenção, risco e prioridade.
3. Atenção: define urgência, risco e importância.
4. Memória curta: mantém o contexto da sessão.
5. Memória longa: guarda neurônios persistentes.
6. Palácio de memória: organiza lembranças por salas/projetos.
7. RAG: ativa lembranças relevantes.
8. Planejamento: cria plano e tasks.
9. Segurança: pede autorização para ações de risco.
10. Execução: terminal, GitHub, arquivos e preview.
11. Recompensa: fortalece padrões úteis.
12. Dataset: salva exemplos para LoRA/fine-tuning futuro.

## O que ela é agora

Uma IA local em forma de biblioteca/agente, capaz de usar modelos open-source como motor e memória/RAG como conhecimento persistente.

## O que ela não é ainda

Ela ainda não é um modelo treinado do zero com bilhões de parâmetros. Para isso, o GitFusion gera dataset e prepara caminho para LoRA/fine-tuning quando houver GPU/ambiente adequado.
