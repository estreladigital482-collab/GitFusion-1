GitFusion v22 - Session 15-10 - APK Android Ready Layer

Objetivo desta sessão:
Preparar o GitFusion para virar APK Android sem quebrar o fluxo atual do Termux/navegador.

O que foi adicionado:
- Capacitor instalado como dependência do projeto.
- capacitor.config.json com appId com.gitfusion.app e webDir dist.
- npm run build copiando public/ para dist/.
- npm run apk:doctor para diagnosticar o ambiente Android/Termux.
- npm run apk:init para criar a pasta android/ com Capacitor.
- npm run apk:sync para sincronizar alterações web com Android.
- npm run apk:open para abrir no Android Studio quando disponível.
- npm run apk:debug para tentar gerar APK debug via Gradle wrapper.

Fluxo recomendado no Termux:
cd ~/GitFusion
npm install
npm run build
npm run apk:doctor
npm run apk:init
npm run apk:sync

Depois disso, para gerar APK:
1. Opção mais fácil: abrir a pasta android/ no Android Studio e gerar APK.
2. Opção local avançada: rodar npm run apk:debug se o ambiente Android/Gradle estiver funcionando.

Observação importante:
A versão web/Termux continua funcionando com npm start.
O APK empacota a interface web do GitFusion. Recursos que dependem de servidor Node local, modelos locais ou terminal ainda precisam de camada nativa/bridge futura para funcionar 100% dentro do APK sem Termux.

Próxima evolução sugerida:
- Bridge Android para comunicação com serviços locais.
- Modo APK + Termux companion.
- Configuração de armazenamento Android persistente.
- Tela interna de diagnóstico APK.
