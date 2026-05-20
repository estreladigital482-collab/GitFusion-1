GitFusion v22 Session 15-5 - Autonomous Workspace Agent

Ordem definida pelo usuário: 2 -> 3 -> 5 -> 4 -> 1 -> 6.
Esta sessão implementa a etapa 2: executor autônomo completo.

Adicionado:
- /api/brain/autonomous
- agente autônomo com ciclos reais de análise -> ação -> verificação
- scanner real do workspace
- snapshot antes da execução
- backups automáticos de arquivos alterados em .gitfusion-backups/<runId>
- ação restore_snapshot
- ações reais adicionais: patch_file, copy_file, delete_file protegido
- retry/ciclos limitados para celular
- relatório de contexto em .gitfusion-agent/
- verificação pós-execução
- script npm run brain:autonomous-selftest

Segurança:
- escreve somente dentro de workspaces/
- bloqueia caminhos fora do workspace
- delete_file exige aprovação explícita
- comandos perigosos seguem bloqueados
- ações longas usam ciclos curtos para rodar melhor no Android/Termux

Próxima etapa planejada pela ordem do usuário:
3. IA local real no celular.
