import fs from 'fs';
import path from 'path';

const root = process.cwd();
const packRoot = path.join(root, 'public', 'gitfusion-ai-pack');
const manifestPath = path.join(packRoot, 'manifests', 'pack.json');
const runtimePath = path.join(root, 'public', 'apk-ai-runtime.js');

function assert(ok, msg){ if(!ok){ console.error('FAIL:', msg); process.exit(1); } }
assert(fs.existsSync(manifestPath), 'manifesto do AI Pack não existe em public/gitfusion-ai-pack/manifests/pack.json');
assert(fs.existsSync(runtimePath), 'apk-ai-runtime.js não existe');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(Array.isArray(manifest.docs) && manifest.docs.length >= 1, 'manifesto sem docs');
assert(Array.isArray(manifest.models), 'manifesto sem registry de modelos');
for(const rel of manifest.docs){
  assert(fs.existsSync(path.join(packRoot, rel)), `doc ausente: ${rel}`);
}
const runtime = fs.readFileSync(runtimePath, 'utf8');
assert(runtime.includes('importBundledAIPack'), 'runtime não expõe importBundledAIPack');
assert(runtime.includes('ensureBundledPackImported'), 'runtime não chama ensureBundledPackImported');
console.log(`AI Pack runtime selftest ok: ${manifest.docs.length} docs, ${manifest.models.length} modelos declarados.`);
