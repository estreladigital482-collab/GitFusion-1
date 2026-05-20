import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const androidDir = path.join(root, 'android');
if (!(await fs.pathExists(androidDir))) {
  console.error('APK build bloqueado: rode npm run apk:init primeiro.');
  process.exit(1);
}

execSync('npm run build', { stdio: 'inherit' });
execSync('node scripts/capacitor-cli.js sync android', { stdio: 'inherit' });
const gradlePath = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
if (!(await fs.pathExists(gradlePath))) {
  console.error('Gradle wrapper não encontrado em android/.');
  console.error('Alternativa: rode npm run apk:termux-prepare e tente de novo, ou gere via GitHub Actions/Docker.');
  process.exit(1);
}
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
execSync(`${gradlew} assembleDebug`, { stdio: 'inherit', cwd: androidDir });
console.log('APK debug gerado em android/app/build/outputs/apk/debug/app-debug.apk');
