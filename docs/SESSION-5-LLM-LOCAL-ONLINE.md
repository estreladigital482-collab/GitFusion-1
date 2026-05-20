# Sessão 5 — LLM local + fallback online

Esta sessão adiciona o núcleo de IA híbrido do GitFusion.

## O que funciona

- Modo automático de IA.
- Detecção de Ollama local em `http://127.0.0.1:11434`.
- Modelo local padrão: `qwen2.5-coder:7b`.
- Fallback online via API compatível com OpenAI/Kimi/OpenRouter/LM Studio.
- Fallback offline sem travar o aplicativo.
- Chat usando RAG local quando disponível.
- Configurações opcionais em `Configurações > IA local / online`.

## Prioridade automática

1. Ollama local, quando disponível.
2. API online compatível, quando configurada e permitida pelo modo online/offline.
3. Fallback offline com RAG, memória e plano local.

## Instalar Ollama no Termux

O Ollama pode não rodar em todos os celulares Android/Termux. Quando não rodar, use API online ou fallback offline.

Modelo sugerido para máquinas/celulares compatíveis:

```bash
ollama pull qwen2.5-coder:7b
```

## APIs compatíveis

Configure uma base URL que aceite o padrão `/v1/chat/completions`, como:

- OpenAI-compatible
- Kimi-compatible quando disponível
- OpenRouter
- LM Studio em rede local
- servidor próprio vLLM/llama.cpp server compatível

## Segurança

Tokens são salvos localmente em `data/settings/ai.json` quando informados no app.
Não envie tokens para o GitHub.
