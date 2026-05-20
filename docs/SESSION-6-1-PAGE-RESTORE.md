# Sessão 6.1 - Restauração de páginas

Correção incremental para restaurar navegação entre todas as páginas depois das mudanças do executor e do composer.

## Ajustes

- Adicionado roteador robusto `gitfusionOpenPage`.
- Clique em qualquer `[data-go]` agora abre a página correta antes de qualquer handler antigo.
- Páginas recebem `hidden` e `aria-hidden` corretamente.
- CSS força `.page.active` a aparecer e `.page[hidden]` a sumir.
- Composer continua preservado.

## Próximo passo

Sessão 7: tarefas autorizáveis conectadas a ações reais.
