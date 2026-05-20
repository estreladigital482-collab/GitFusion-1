# GitFusion

App mobile-first para vincular GitHub, analisar repositórios, fundir fontes e exportar ZIP.

## Rodar

```bash
npm install
npm start
```

Abra: http://127.0.0.1:3737

## Token GitHub
Cole no app em GitHub > Token. O token fica no localStorage do navegador e é enviado apenas nas chamadas da sessão.

## GitFusion Core AI

Esta versão inclui um núcleo de IA próprio dentro do backend:

- `server/model/gitfusion-core.js`
- chat executor em `/api/model/chat`
- status em `/api/model/status`
- memória local em `data/model-memory/memory.jsonl`
- dataset para fine-tuning futuro em `/api/model/dataset`

Ele tenta usar Ollama local automaticamente. Se não encontrar modelo local, usa API online compatível quando configurada. Se nenhum dos dois existir, continua funcionando com raciocínio local por regras e memória.


## v18
- Perfil/configurações com cards separados por espaço real.
- Áreas funcionais: Personalização, Memória do projeto e Espaço de trabalho.
- `.env` e `.env.example` incluídos. O servidor carrega variáveis com dotenv.
