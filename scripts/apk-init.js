import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const distIndex = path.join(root, 'dist', 'index.html');
if (!(await fs.pathExists(distIndex))) {
  console.error('APK init bloqueado: rode npm run build primeiro.');
  process.exit(1);
}

const capBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'cap.cmd' : 'cap');
if (!(await fs.pathExists(capBin))) {
  console.error('Capacitor não está instalado localmente.');
  console.error('Rode: npm run apk:install-capacitor');
  process.exit(127);
}

const androidDir = path.join(root, 'android');
if (await fs.pathExists(androidDir)) {
  console.log('Android já existe. Rodando sync...');
  execSync('node scripts/capacitor-cli.js sync android', { stdio: 'inherit' });
  execSync('node scripts/generate-android-icons.js', { stdio: 'inherit' });
  process.exit(0);
}

console.log('Criando projeto Android com Capacitor...');
execSync('node scripts/capacitor-cli.js add android', { stdio: 'inherit' });
execSync('node scripts/generate-android-icons.js', { stdio: 'inherit' });
console.log('Android criado. Rode npm run apk:sync sempre que atualizar o app.');
