import fs from 'fs-extra';
import path from 'path';

const root = process.cwd();
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
const prepared = path.join(root, 'resources', 'android-icons');
const src = path.join(root, 'resources', 'icon.png');

if (!(await fs.pathExists(androidRes))) {
  console.error('Pasta Android não encontrada. Rode primeiro: npm run apk:init');
  process.exit(1);
}

if (await fs.pathExists(prepared)) {
  const dirs = await fs.readdir(prepared);
  for (const dir of dirs) {
    const from = path.join(prepared, dir);
    const to = path.join(androidRes, dir);
    await fs.ensureDir(to);
    await fs.copy(from, to, { overwrite: true });
  }
  console.log('Ícones externos do APK aplicados a partir de resources/android-icons.');
  console.log('As logos internas do app continuam usando public/assets originais.');
  process.exit(0);
}

if (!(await fs.pathExists(src))) {
  console.error('resources/icon.png não encontrado. Coloque a logo externa do APK ali.');
  process.exit(1);
}

console.log('resources/icon.png existe, mas resources/android-icons não foi gerado.');
console.log('Gere os PNGs por densidade ou use a versão 16-7, que já traz resources/android-icons pronto.');
