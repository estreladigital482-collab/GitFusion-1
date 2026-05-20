# GitFusion AI Core

Esta versão cria o núcleo de IA próprio do GitFusion sem mudar o nome do app.

## O que foi integrado

- Motor agente `GitFusionCore` no backend.
- Chat executor conectado a `/api/model/chat`.
- Memória local em `data/model-memory/memory.jsonl`.
- Aprendizado prático por exemplos e histórico, sem treinar pesos no celular.
- Suporte automático a Ollama local quando instalado.
- Suporte opcional a API online compatível com OpenAI/Kimi via variáveis `.env`.
- Fallback local por regras quando não existe modelo rodando.

## Variáveis opcionais

```bash
GITFUSION_AI_BASE_URL=https://api.exemplo.com
GITFUSION_AI_TOKEN=seu_token
GITFUSION_AI_MODEL=modelo
```

Para local via Ollama, instale e baixe um modelo coder:

```bash
ollama pull qwen2.5-coder:7b
```

No Termux puro, Ollama pode não rodar dependendo do aparelho. O app continua funcionando com fallback local e memória.

## Dataset para fine-tuning futuro

Endpoint:

```txt
GET /api/model/dataset
```

Ele exporta conversas/memórias no formato `messages`, útil para preparar fine-tuning/LoRA em outro ambiente com GPU.
