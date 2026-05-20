# GitFusion AI Library

Sessão 14.2 adiciona a biblioteca local da IA do GitFusion.

## Objetivo

Criar uma IA gratuita/local usando modelos open-source como motor, MemPalace como memória, RAG antes de agir e dataset automático para treino futuro.

## Camadas

1. **Model Library**
   - Qwen Coder
   - DeepSeek Coder
   - CodeLlama
   - TinyLlama
   - via Ollama agora
   - llama.cpp preparado como runtime futuro

2. **MemPalace**
   - projeto = sala
   - arquivo = objeto
   - erro = marcação
   - solução = memória forte
   - decisão = anotação

3. **RAG antes de agir**
   - busca MemPalace
   - busca memória/wiki/projetos quando os serviços estiverem plugados
   - monta contexto
   - só então chama modelo local/fallback

4. **Dataset automático**
   - cada interação vira JSONL
   - cada projeto concluído pode ser exportado como dataset
   - compatível com fine-tuning/LoRA futuro

## Endpoints

- `GET /api/ai-library/status`
- `POST /api/ai-library/think`
- `GET /api/ai-library/palace/rooms`
- `POST /api/ai-library/palace/rooms`
- `POST /api/ai-library/palace/object`
- `GET /api/ai-library/palace/search?q=...`
- `POST /api/ai-library/dataset/example`

## Como instalar modelos com Ollama

No ambiente que suporta Ollama:

```bash
ollama pull qwen2.5-coder:1.5b
ollama pull tinyllama:1.1b
```

Depois o GitFusion detecta automaticamente.

## Observação

Essa biblioteca não copia conhecimento interno de outras IAs. Ela usa modelos open-source como motores e cria a inteligência própria do GitFusion por memória, RAG, skills, histórico e dataset.
