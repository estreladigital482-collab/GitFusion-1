# Sessão 2.1 — Modo Automático / Online / Offline

Esta atualização adiciona um modo operacional real para o GitFusion:

- **Automático:** detecta rede e escolhe online/offline.
- **Online:** prioriza GitHub, APIs e modelos remotos.
- **Offline:** não tenta acessar internet; usa arquivos locais, memória local e fallback local.

## Endpoints adicionados

- `GET /api/connectivity/status`
- `GET /api/connectivity/mode`
- `POST /api/connectivity/mode` com `{ "mode": "auto" | "online" | "offline" }`

## Comportamento no backend

- IA respeita offline e não tenta chamar Ollama/API remota quando o modo offline estiver ativo.
- Importação de repositórios bloqueia com mensagem clara quando offline.
- Status mostra rede, GitHub, IA local e modo efetivo.

## Próxima sessão

Sessão 3: Wiki por projeto.
