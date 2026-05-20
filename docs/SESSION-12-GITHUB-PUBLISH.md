# Sessão 12, GitHub publish real

Esta sessão adiciona publicação GitHub mais completa ao GitFusion.

## Entrou

- Criar repositório novo no GitHub pelo token do usuário.
- Escolher público/privado.
- Escolher branch inicial.
- Gerar README.md automático.
- Gerar TASKS.md automático.
- Commit inicial automático.
- Push automático do projeto mesclado.
- Listar branches locais do projeto.
- Criar/trocar branch local.
- Pull do repositório publicado.
- Histórico básico no metadata do projeto.

## Como usar

1. Gere um projeto mesclado.
2. Abra **Publicar no GitHub**.
3. Cole o token.
4. Selecione o projeto.
5. Escolha nome, descrição, branch e opções.
6. Clique em **Publicar repositório final**.

## Observação de segurança

O token é enviado apenas para o backend local no Termux. Depois do push, o remote é regravado sem o token.
