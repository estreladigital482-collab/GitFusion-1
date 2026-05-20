import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const androidDir = path.join(root, 'android');
if (!(await fs.pathExists(androidDir))) {
  console.error('APK sync bloqueado: a pasta android ainda não existe. Rode: npm run apk:init');
  process.exit(1);
}
execSync('npm run build', { stdio: 'inherit' });
execSync('node scripts/capacitor-cli.js sync android', { stdio: 'inherit' });
execSync('node scripts/generate-android-icons.js', { stdio: 'inherit' });
