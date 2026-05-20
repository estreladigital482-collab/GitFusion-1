# Treino futuro / LoRA

Esta pasta guarda datasets JSONL gerados pelo GitFusion.

Formato básico:

```json
{"instruction":"...","input":"...","output":"...","workspaceId":"...","projectId":"...","metadata":{}}
```

Uso futuro:

1. Juntar datasets de projetos concluídos.
2. Limpar dados sensíveis.
3. Separar treino/validação.
4. Treinar LoRA em cima de um modelo coder pequeno.
5. Exportar adaptador.
6. Rodar localmente via runtime compatível.

Importante: não treine com tokens, senhas ou código privado sem revisar.
