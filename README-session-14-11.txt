GitFusion v22 - Session 14.11 sidebar rollback/fix

Correções aplicadas sobre a versão 14-10:

1. Sidebar mobile voltou a preencher a tela inteira:
   - width: 100vw
   - max-width: 100vw
   - height/min-height: 100dvh

2. Tamanho visual dos itens restaurado para a escala anterior:
   - linhas menores
   - textos menores
   - ícones principais mantidos
   - padding compacto

3. Menu limpo:
   - removido indicador ">" / caret visual
   - removidos ícones/botões extras de ações secundárias que espremiam o texto
   - mantidos apenas os ícones principais das páginas

4. Tasks:
   - mantido botão "Nova task" dentro da tela de Tasks

5. Gestos/arraste:
   - desativado swipe para abrir Preview pela lateral direita
   - Preview agora abre pelo botão Play
   - swipe para abrir sidebar só dispara a partir da borda esquerda
   - evita o problema em que a tela inteira se juntava e abria o preview ao arrastar com o dedo

Arquivos alterados:
- public/styles.css
- public/app.js
