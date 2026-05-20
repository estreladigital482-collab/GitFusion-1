# GitFusion AI Backend

A aba **IA** aceita dois modos:

1. **Ollama local**
   - URL padrão: `http://127.0.0.1:11434`
   - Modelo sugerido para código: `qwen2.5-coder:7b`
   - Modelo leve: `llama3.2:3b`

2. **OpenAI-compatible**
   - Serve para llama.cpp server, LocalAI, LM Studio, Jan, OpenRouter, Groq ou qualquer servidor compatível com `/v1/chat/completions`.
   - Preencha URL, modelo e token se necessário.

## Aprendizado local
O app não treina os pesos do modelo. Isso exigiria treino/fine-tuning pesado.
Ele usa **memória local/RAG simples**: salva preferências e decisões do projeto em `data/memory.json` e envia esse contexto para o modelo nas próximas respostas.

## Teste rápido com Ollama no PC
```bash
ollama pull qwen2.5-coder:7b
ollama serve
```
Depois use a URL `http://IP_DO_PC:11434` no celular se estiver na mesma rede.

## Teste com llama.cpp server
Use uma build do llama.cpp com server OpenAI-compatible e coloque no app:
```txt
Modo: OpenAI-compatible
URL: http://127.0.0.1:8080
Modelo: nome-do-modelo
```
