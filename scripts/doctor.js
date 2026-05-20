import fs from 'fs-extra';
import { config } from '../server/config.js';

console.log('GitFusion Doctor');
console.log('Version: 0.1.22');
console.log('Port:', config.port);
console.log('Data dir:', config.dataDir, await fs.pathExists(config.dataDir) ? 'ok' : 'missing');
console.log('Workspace:', config.workspaceDir, await fs.pathExists(config.workspaceDir) ? 'ok' : 'missing');
console.log('AI provider:', config.ai.provider);
console.log('Terminal enabled:', config.terminalEnabled);
