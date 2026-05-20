import { runBrain } from '../server/brain/brainCore.js';

const run = await runBrain({
  prompt: 'crie projeto selftest-gitfusion',
  projectId: 'general',
  execute: true,
  source: 'selftest'
});
const ok = run?.execution?.real?.ok && run?.actions?.length >= 2;
console.log(JSON.stringify({ ok, id: run.id, actions: run.actions?.length, real: run.execution?.real }, null, 2));
if (!ok) process.exit(1);
