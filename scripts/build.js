import fs from 'fs-extra';
import path from 'path';

const root = process.cwd();
const required = [
  'public/index.html',
  'public/app.js',
  'public/styles.css',
  'public/manifest.webmanifest',
  'server/index.js',
  'server/routes/brain.js',
  'server/brain/brainCore.js'
];

for (const file of required) {
  if (!(await fs.pathExists(path.join(root, file)))) {
    console.error(`Build check failed: missing ${file}`);
    process.exit(1);
  }
}

await fs.ensureDir(path.join(root, 'dist'));
await fs.copy(path.join(root, 'public'), path.join(root, 'dist'));
console.log('GitFusion build ok: public/ copied to dist/');
console.log('Para APK futuro: use Capacitor apontando web-dir para dist ou public.');
