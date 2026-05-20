import { exec } from 'child_process';
import { config } from '../config.js';

const BLOCKED = [
  /\brm\s+-rf\s+\//i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bsu\b/i,
  /\bsudo\b/i,
  /:\(\)\s*\{\s*:\|:&\s*\}/
];

export async function runTerminalCommand(command){
  const cmd = String(command || '').trim();
  if(!cmd) throw new Error('Comando vazio.');
  if(cmd.length > 500) throw new Error('Comando muito longo.');
  if(BLOCKED.some(rx => rx.test(cmd))) throw new Error('Comando bloqueado por segurança.');

  return await new Promise((resolve) => {
    exec(cmd, { cwd: config.workspaceDir, timeout: 30000, maxBuffer: 1024 * 1024, shell: '/bin/sh' }, (error, stdout, stderr) => {
      resolve({
        command: cmd,
        cwd: config.workspaceDir,
        code: error && typeof error.code === 'number' ? error.code : 0,
        stdout: stdout || '',
        stderr: stderr || (error && error.killed ? 'Comando encerrado por timeout.' : ''),
        ok: !error
      });
    });
  });
}
