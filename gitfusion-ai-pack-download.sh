#!/data/data/com.termux/files/usr/bin/bash
set -e

BASE="$HOME/GitFusion-AI-Pack"
mkdir -p "$BASE/models" "$BASE/docs" "$BASE/datasets" "$BASE/indexes" "$BASE/manifests"

echo "GitFusion AI Pack Downloader"

cat > "$BASE/manifests/pack.json" <<'JSON'
{
  "name": "GitFusion AI Pack",
  "version": "0.1.0",
  "models": [
    {
      "id": "tinyllama",
      "name": "TinyLlama GGUF",
      "type": "gguf",
      "path": "models/tinyllama.gguf"
    },
    {
      "id": "qwen-coder",
      "name": "Qwen Coder GGUF",
      "type": "gguf",
      "path": "models/qwen-coder.gguf"
    },
    {
      "id": "deepseek-coder",
      "name": "DeepSeek Coder GGUF",
      "type": "gguf",
      "path": "models/deepseek-coder.gguf"
    }
  ],
  "docs": [
    "docs/javascript.md",
    "docs/nodejs.md",
    "docs/git.md",
    "docs/android-apk.md"
  ]
}
JSON

cat > "$BASE/docs/javascript.md" <<'EOF'
# JavaScript Base
- Sintaxe
- DOM
- Fetch
- Async/await
- LocalStorage
- IndexedDB
EOF

cat > "$BASE/docs/nodejs.md" <<'EOF'
# Node.js Base
- Express
- Rotas
- Serviços
- File system
- APIs locais
EOF

cat > "$BASE/docs/git.md" <<'EOF'
# Git Base
- init
- clone
- branch
- commit
- merge
- conflito
EOF

cat > "$BASE/docs/android-apk.md" <<'EOF'
# Android APK Build
- Capacitor
- Gradle
- Android SDK
- Termux
- APK debug
EOF

cat > "$BASE/datasets/seed.jsonl" <<'EOF'
{"instruction":"Explique o objetivo do GitFusion","response":"GitFusion é um ambiente mobile-first para criar, organizar, analisar e evoluir projetos com IA local, memória e RAG."}
{"instruction":"Como agir quando não houver modelo local?","response":"Usar MemPalace, RAG local e resposta honesta, explicando que nenhum modelo está instalado."}
EOF

cat > "$BASE/indexes/local-index.json" <<'JSON'
{
  "status": "seed",
  "chunks": []
}
JSON

echo "Pacote base criado em:"
echo "$BASE"
echo
echo "Agora compacte com:"
echo "cd ~ && zip -r GitFusion-AI-Pack.zip GitFusion-AI-Pack"
