#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/training/autotrainer-cache"
REG="$ROOT/public/autotrainer-sources.json"
mkdir -p "$OUT"
node --input-type=module <<'NODE' > /tmp/gitfusion-autotrainer-urls.txt
import fs from 'fs';
const reg=JSON.parse(fs.readFileSync('public/autotrainer-sources.json','utf8'));
for(const pack of reg.packs||[]) for(const s of pack.sources||[]) console.log(`${s.id}\t${s.url}`);
NODE
while IFS=$'\t' read -r id url; do
  safe="$(echo "$id" | tr -cd 'a-zA-Z0-9._-')"
  echo "Baixando $id"
  curl -L --retry 3 --connect-timeout 20 -o "$OUT/$safe.txt" "$url" || echo "Falhou: $url" >&2
done < /tmp/gitfusion-autotrainer-urls.txt
node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';
const dir='training/autotrainer-cache';
const rows=[];
for(const file of fs.readdirSync(dir)){
  const text=fs.readFileSync(path.join(dir,file),'utf8').slice(0,900000);
  if(text.trim().length<80) continue;
  rows.push(JSON.stringify({instruction:'Use este documento como conhecimento local do GitFusion.', input:text.slice(0,6000), output:`Documento ${file} importado para dataset offline.`, meta:{file}}));
}
fs.mkdirSync('training/datasets',{recursive:true});
fs.writeFileSync('training/datasets/autotrainer-termux-dataset.jsonl', rows.join('\n')+'\n');
console.log(`Dataset criado: ${rows.length} linhas em training/datasets/autotrainer-termux-dataset.jsonl`);
NODE
