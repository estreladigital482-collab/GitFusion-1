#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$HOME/GitFusion"
mkdir -p models
node - <<'NODE' > /tmp/gitfusion-ai-downloads.sh
const fs=require('fs');
const r=JSON.parse(fs.readFileSync('public/ai-pack-registry.json','utf8'));
console.log('set -euo pipefail');
console.log('mkdir -p "$HOME/GitFusion/models"');
for (const m of r.models) console.log(`curl -L --retry 5 --continue-at - -o "$HOME/GitFusion/models/${m.filename}" "${m.hfUrl}"`);
NODE
bash /tmp/gitfusion-ai-downloads.sh
ls -lh models
