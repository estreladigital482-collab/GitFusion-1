# GitFusion AI Brain Library

Esta sessão cria a primeira versão da IA local própria do GitFusion.

Ela não é um modelo treinado do zero. Ela é uma biblioteca cerebral local que conecta:

- memória curta;
- memória longa;
- Wiki;
- RAG;
- modelos locais gratuitos via Ollama/llama.cpp;
- roteador de modelos;
- tasks;
- terminal;
- recompensas;
- dataset futuro para LoRA/fine-tuning.

## Metáfora do cérebro

| Cérebro humano | GitFusion |
|---|---|
| Dendritos | `receptors.js` recebe sinais |
| Corpo celular | `perception.js` + `reasoning.js` entendem e decidem |
| Axônio | `executor.js` leva ações para terminal/GitHub/arquivos |
| Sinapses | `synapses.js` conecta memórias e eventos |
| Hipocampo | `longMemory.js` + Wiki/MemPalace local |
| Memória curta | `workingMemory.js` |
| Amígdala | `safety.js` analisa risco |
| Dopamina | `reward.js` registra sucesso/erro |

## Endpoints

- `GET /api/brain/status`
- `POST /api/brain/signal`
- `POST /api/brain/think`
- `GET /api/brain/neurons`
- `POST /api/brain/neurons`
- `POST /api/brain/synapses`
- `POST /api/brain/reward`
- `POST /api/brain/rag`
- `GET /api/brain/datasets`

## Dados locais

Os dados ficam em:

```txt
data/brain/
  neurons.json
  synapses.json
  rewards.json
  thoughts.json
  state.json
  datasets/
```

## Próximo passo

A próxima sessão pode criar a tela **Cérebro IA** dentro do app para visualizar neurônios, sinapses, memórias ativadas, recompensas e dataset.
