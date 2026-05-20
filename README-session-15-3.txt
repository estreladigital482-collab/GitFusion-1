GitFusion v22 Session 15.3 - Brain conectado ao Chat

Objetivo
- Conectar visualmente o GitFusion Brain Core ao chat mobile.
- Exibir progresso, tempo estimado, intenção, modo de segurança, modelo e etapas.
- Manter execução em modo supervisionado para celular.

Implementado
- Mensagens do Brain agora renderizam um card próprio no chat.
- O chat chama /api/brain/run diretamente.
- Resposta do Brain substitui o card de carregamento inicial.
- Tasks retornadas pelo Brain entram no painel de tarefas.
- Histórico local de execuções em state.brainRuns.
- CSS novo para barra de progresso, etapas e metadados.

Arquivos alterados
- public/app.js
- public/styles.css
- README-session-15-3.txt

Notas
- Esta versão ainda não executa comandos perigosos automaticamente.
- A execução real continua supervisionada pelo módulo safety.
- Próximo passo: criar executor seguro por permissão, com ações reais em arquivos/terminal.
