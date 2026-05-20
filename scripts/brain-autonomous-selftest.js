import { runAutonomousAgent } from '../server/brain/autonomousAgent.js';

const run = await runAutonomousAgent({
  prompt: 'crie projeto selftest-agent e liste workspace',
  projectId: 'general',
  execute: true,
  approved: true,
  maxCycles: 2,
  source: 'autonomous-selftest'
});
const ok = run?.finalStatus === 'completed' && run?.cycles?.some(c => c.execution?.results?.some(r => r.ok));
console.log(JSON.stringify({ ok, id: run.id, status: run.finalStatus, cycles: run.cycles?.length, progress: run.progress }, null, 2));
if (!ok) process.exit(1);
