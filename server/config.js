import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT || 3737),
  root: ROOT,
  publicDir: path.join(ROOT, 'public'),
  workspaceDir: path.resolve(process.env.WORKSPACE_DIR || path.join(ROOT, 'workspaces')),
  dataDir: path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data')),
  githubToken: process.env.GITHUB_TOKEN || '',
  ai: {
    provider: process.env.GITFUSION_AI_PROVIDER || 'auto',
    localUrl: process.env.GITFUSION_AI_LOCAL_URL || process.env.GITFUSION_AI_BASE_URL || 'http://127.0.0.1:11434',
    localModel: process.env.GITFUSION_AI_LOCAL_MODEL || process.env.GITFUSION_AI_MODEL || 'qwen2.5-coder:7b',
    onlineBaseUrl: process.env.GITFUSION_AI_BASE_URL || '',
    onlineModel: process.env.GITFUSION_AI_MODEL || '',
    token: process.env.GITFUSION_AI_TOKEN || process.env.OPENAI_API_KEY || process.env.KIMI_API_KEY || '',
  },
  terminalEnabled: String(process.env.GITFUSION_ENABLE_TERMINAL || 'false') === 'true',
};
