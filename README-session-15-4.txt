GitFusion v22 - Session 15.4 - Real Brain Executor

Objetivo desta sessão:
Transformar o Brain Core em um executor real e verificável, evitando módulos apenas demonstrativos.

Implementado:
- server/brain/realExecutor.js
  Executor real para ações seguras dentro do workspace ativo.
  Ações suportadas:
  - create_brain_report
  - create_project_structure
  - write_file
  - append_file
  - read_file
  - list_workspace
  - mkdir
  - run_command com allowlist e proteção mobile

- server/brain/actionPlanner.js
  Converte pedidos do chat em ações reais verificáveis.
  Exemplos:
  - "crie projeto X" cria pasta real em workspaces/<ativo>/X
  - pedido de merge cria merge-workspace e arquivo merge-plan real
  - toda execução salva relatório em brain-runs/<runId>.md

- server/brain/brainCore.js
  Agora executa ações reais durante o run do Brain.
  Salva progresso, tasks, relatório e resultado real.

- server/routes/brain.js
  Nova rota POST /api/brain/execute para executar ações estruturadas.

- public/app.js
  Chat envia execute:true para o Brain Core e mostra quantidade de ações reais executadas.

- scripts/brain-selftest.js
  Teste real do Brain criando um projeto no workspace.

Comandos úteis:
- npm start
- npm run brain:selftest
- npm run brain:status
- npm run brain:runs

Segurança:
- O executor só escreve dentro de workspaces/<workspace ativo>.
- Caminhos com ../ são bloqueados.
- Comandos perigosos são bloqueados.
- Comandos fora da allowlist são bloqueados.
- npm/git e comandos potencialmente modificadores exigem aprovação explícita.

Ainda falta:
- Editor visual de arquivos no app.
- Diff visual antes/depois.
- Execução inteligente baseada em arquivos reais do projeto inteiro.
- Merge completo automático entre dois ZIPs/repositórios com resolução de conflitos.
- Integração com modelos locais maiores quando o Android/Termux aguentar.
