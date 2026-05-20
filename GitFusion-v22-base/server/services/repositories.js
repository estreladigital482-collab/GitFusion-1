import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { nanoid } from 'nanoid';
import { config } from '../config.js';

export function parseGitHubRepo(input) {
  const raw = String(input || '').trim().replace(/\.git$/, '');
  const match = raw.match(/github\.com[:/](?<owner>[^/\s]+)\/(?<repo>[^/#?\s]+)/i);
  if (!match?.groups) throw new Error(`URL inválida: ${input}`);
  const owner = match.groups.owner;
  const repo = match.groups.repo;
  return { owner, repo, url: `https://github.com/${owner}/${repo}`, safe: `${owner}-${repo}`.toLowerCase().replace(/[^a-z0-9_.-]/g, '-') };
}

async function fetchRepoZip(meta, branch) {
  const headers = { 'User-Agent': 'GitFusion/0.1.22' };
  if (config.githubToken) headers.Authorization = `Bearer ${config.githubToken}`;
  const res = await fetch(`https://codeload.github.com/${meta.owner}/${meta.repo}/zip/refs/heads/${branch}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function importRepos(urls = []) {
  const projectId = nanoid(10);
  const projectDir = path.join(config.workspaceDir, projectId);
  await fs.ensureDir(projectDir);
  const repos = [];
  const logs = [];
  for (const url of urls) {
    const meta = parseGitHubRepo(url);
    let branch = 'main';
    let buffer;
    try { buffer = await fetchRepoZip(meta, 'main'); }
    catch { branch = 'master'; buffer = await fetchRepoZip(meta, 'master'); }
    const zipPath = path.join(projectDir, `${meta.safe}.zip`);
    const repoDir = path.join(projectDir, 'repos', meta.safe);
    await fs.writeFile(zipPath, buffer);
    await fs.ensureDir(repoDir);
    new AdmZip(zipPath).extractAllTo(repoDir, true);
    repos.push({ ...meta, branch, dir: repoDir });
    logs.push(`Importado ${meta.owner}/${meta.repo}@${branch}`);
  }
  return { projectId, projectDir, repos, logs };
}

export async function tree(dir, base = dir, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const ignore = new Set(['.git', 'node_modules', 'dist', 'build']);
  const out = [];
  for (const entry of entries.sort((a,b)=>Number(b.isDirectory())-Number(a.isDirectory())||a.name.localeCompare(b.name))) {
    if (ignore.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const item = { name: entry.name, path: path.relative(base, full), type: entry.isDirectory() ? 'dir' : 'file' };
    if (entry.isDirectory()) item.children = await tree(full, base, depth + 1, maxDepth);
    out.push(item);
  }
  return out;
}
