# GitFusion

GitFusion é um laboratório mobile-first para fundir repositórios públicos do GitHub em um novo pacote de projeto.

Ele não é uma tela fake: o backend realmente baixa os repositórios, analisa estruturas, detecta stacks/dependências, preserva um projeto base, importa os outros em uma área consolidada e exporta um ZIP real.

## O que funciona nesta versão

- Adicionar 2 ou mais URLs de repositórios públicos GitHub.
- Baixar os repositórios via `codeload.github.com`.
- Detectar stack básica por `package.json`.
- Mostrar logs reais do processo.
- Escolher um repositório base.
- Criar projeto fundido preservando a base.
- Importar os outros projetos em `gitfusion-imports/`.
- Gerar `GITFUSION_REPORT.md`.
- Gerar `gitfusion.dependencies.json`.
- Baixar ZIP real do projeto consolidado.
- Rodar com Docker.
- Preparar APK Android via GitHub Actions.

## Rodar no Termux

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git unzip
npm install
npm start
```

Abra no navegador:

```txt
http://127.0.0.1:3737
```

## Rodar com Docker

```bash
docker compose up --build
```

Abra:

```txt
http://127.0.0.1:3737
```

## Como testar rápido

Use dois repositórios públicos pequenos. Exemplo:

```txt
https://github.com/vitejs/vite
https://github.com/tastejs/todomvc
```

Para testes mais leves, prefira repositórios pequenos. Projetos gigantes vão demorar e consumir mais armazenamento no celular.

## APK Android

O APK é um cliente mobile. Ele precisa que o backend GitFusion esteja rodando em algum lugar.

Na configuração padrão do workflow, o cliente Android aponta para:

```txt
http://127.0.0.1:3737
```

Ou seja, no celular você pode rodar o backend pelo Termux e abrir o app Android como interface mobile.

Para gerar APK:

```bash
gh workflow run build-android-apk.yml
gh run list
gh run watch ID_DO_BUILD
gh run download ID_DO_BUILD
```

## Observação importante

Fusão automática perfeita de qualquer stack ainda é um problema grande. Esta versão faz uma fusão segura e real:

- mantém a base intacta;
- importa os demais repositórios;
- registra dependências e conflitos;
- gera relatório técnico;
- exporta ZIP.

A próxima evolução é permitir escolher telas/componentes específicos e aplicar migração assistida por IA.
