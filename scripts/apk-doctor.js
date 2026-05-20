import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const checks = [];

function commandExists(command) {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore', shell: '/bin/sh' });
    return true;
  } catch {
    return false;
  }
}

function add(name, ok, hint = '') {
  checks.push({ name, ok, hint });
}

const packageJsonPath = path.join(root, 'package.json');
const capConfigPath = path.join(root, 'capacitor.config.json');
const distIndexPath = path.join(root, 'dist', 'index.html');
const publicIndexPath = path.join(root, 'public', 'index.html');

add('package.json', await fs.pathExists(packageJsonPath), 'Rode dentro da pasta ~/GitFusion.');
add('capacitor.config.json', await fs.pathExists(capConfigPath), 'A versão 15-10 precisa estar descompactada.');
add('public/index.html', await fs.pathExists(publicIndexPath), 'A pasta public precisa existir.');
add('dist/index.html', await fs.pathExists(distIndexPath), 'Rode npm run build antes de sincronizar o Android.');
add('Node.js', commandExists('node'), 'Instale Node no Termux.');
add('npm', commandExists('npm'), 'Instale npm no Termux.');
add('npx', commandExists('npx'), 'Instale npm/npx.');
add('Java/JDK', commandExists('java'), 'Para gerar APK localmente precisa de JDK/Android toolchain.');
add('Gradle', commandExists('gradle'), 'Opcional no Termux; Android Studio também pode gerar o APK.');

const okCount = checks.filter(c => c.ok).length;
console.log(`GitFusion APK Doctor: ${okCount}/${checks.length} checks ok`);
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.ok ? '' : ` — ${c.hint}`}`);
}

if (!(await fs.pathExists(distIndexPath))) {
  console.log('\nPróximo passo: npm run build');
} else if (!(await fs.pathExists(path.join(root, 'android')))) {
  console.log('\nPróximo passo: npm run apk:init');
} else {
  console.log('\nPróximo passo: npm run apk:sync');
}
