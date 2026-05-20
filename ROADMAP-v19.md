# GitFusion v19 Roadmap Implementado

## Base técnica
- `dotenv` declarado no `package.json`.
- `.env` e `.env.example` mantidos, mas o app abre sem IA externa.
- Novos endpoints de settings, temas, preview de arquivo e exclusão de projeto.

## Fluxo principal
- Entrada abre direto no foco principal: colar links de repositórios.
- Repositórios viram chips com botão de remover.
- Gerar fusão cria chat de projeto e executa análise/fusão real.

## Projetos mesclados
- Biblioteca de projetos como pastas.
- Árvore de arquivos estilo VS Code.
- Preview de conteúdo de arquivo.
- Exclusão do projeto aberto.

## Temas completos
- ChatGPT Minimal.
- Espaço Estelar.
- Cyberpunk Roxo.
- VS Code Dark.
- Terminal Hacker.
- Clean Mobile.

Cada tema altera fundo, cards, botões, tipografia/atmosfera e animações.

## Próximos passos técnicos
- Persistir chats no backend, não só localStorage.
- Criar streaming real dos logs por SSE.
- Criar editor de arquivos embutido.
- Criar diff visual entre repositórios.
- Criar seletor de arquivos/componentes para mesclar.
