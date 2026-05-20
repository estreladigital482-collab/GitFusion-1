import fs from 'fs-extra';
import path from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const bin = process.platform === 'win32'
  ? path.join(root, 'node_modules', '.bin', 'cap.cmd')
  : path.join(root, 'node_modules', '.bin', 'cap');

if (!(await fs.pathExists(bin))) {
  console.error('Capacitor CLI não encontrado em node_modules/.bin/cap.');
  console.error('Rode: npm run apk:install-capacitor');
  console.error('Se a internet falhar, rode: npm config set registry https://registry.npmjs.org/');
  process.exit(127);
}

const args = process.argv.slice(2);
const result = spawnSync(bin, args, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
