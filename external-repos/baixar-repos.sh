#!/data/data/com.termux/files/usr/bin/bash

set -e

REPOS=(
"https://github.com/anthropics/claude-code-security-review.git"
"https://github.com/CJ6XU3JP4/Claude-Code-Auditor-Enhanced.git"
"https://github.com/open-jarvis/OpenJarvis.git"
"https://github.com/open-jarvis-legacy/legacy-jarvis.git"
"https://github.com/milla-jovovich/mempalace-Aya-fork.git"
"https://github.com/MemPalace/mempalace.git"
"https://github.com/obsidianmd/obsidian-releases.git"
"https://github.com/obsidianmd/obsidian-sample-plugin.git"
"https://github.com/obsidianmd/obsidian-clipper.git"
"https://github.com/obsidianmd/jsoncanvas.git"
"https://github.com/obsidianmd/obsidian-help.git"
"https://github.com/browser-use/browser-use.git"
"https://github.com/openclaw/openclaw.git"
"https://github.com/NVIDIA/NemoClaw.git"
"https://github.com/ln-dev7/square-ui.git"
"https://github.com/lightningpixel/modly.git"
"https://github.com/MoonshotAI/Kimi-K2.5.git"
"https://github.com/kimi-K2-6/kimi-K2.6.git"
)

echo "Baixando repositórios dentro de:"
pwd
echo ""

for repo in "${REPOS[@]}"; do
  name=$(basename "$repo" .git)

  if [ -d "$name" ]; then
    echo "Atualizando: $name"
    cd "$name"
    git pull || true
    cd ..
  else
    echo "Clonando: $name"
    git clone --depth 1 "$repo" || echo "Falhou: $repo"
  fi

  echo ""
done

echo "Finalizado."
