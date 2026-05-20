import fs from 'fs-extra';
import path from 'path';

function safeName(input='run') { return String(input).replace(/[^a-zA-Z0-9_.-]/g,'-').slice(0,80) || 'run'; }

export async function createSnapshot(root, runId = 'run') {
  const dir = path.join(root, '.gitfusion-backups', safeName(runId));
  await fs.ensureDir(dir);
  await fs.writeJson(path.join(dir, 'snapshot.json'), { createdAt: new Date().toISOString(), root, runId, files: [] }, { spaces: 2 });
  return { dir, runId };
}

export async function backupFile(root, runId, relPath) {
  const source = path.join(root, relPath);
  const backupRoot = path.join(root, '.gitfusion-backups', safeName(runId));
  const target = path.join(backupRoot, 'files', relPath);
  await fs.ensureDir(path.dirname(target));
  const exists = await fs.pathExists(source);
  if (exists) await fs.copy(source, target, { overwrite: true, errorOnExist: false });
  const metaPath = path.join(backupRoot, 'snapshot.json');
  const meta = await fs.readJson(metaPath).catch(() => ({ createdAt: new Date().toISOString(), root, runId, files: [] }));
  meta.files = meta.files || [];
  if (!meta.files.some(f => f.path === relPath)) meta.files.push({ path: relPath, existed: exists, backedAt: new Date().toISOString() });
  await fs.writeJson(metaPath, meta, { spaces: 2 });
  return { path: relPath, existed };
}

export async function restoreSnapshot(root, runId) {
  const backupRoot = path.join(root, '.gitfusion-backups', safeName(runId));
  const meta = await fs.readJson(path.join(backupRoot, 'snapshot.json'));
  const restored = [];
  for (const file of meta.files || []) {
    const target = path.join(root, file.path);
    const source = path.join(backupRoot, 'files', file.path);
    if (file.existed && await fs.pathExists(source)) {
      await fs.ensureDir(path.dirname(target));
      await fs.copy(source, target, { overwrite: true });
      restored.push({ path: file.path, restored: true });
    } else if (!file.existed) {
      await fs.remove(target);
      restored.push({ path: file.path, removedCreatedFile: true });
    }
  }
  return { runId, restored };
}
