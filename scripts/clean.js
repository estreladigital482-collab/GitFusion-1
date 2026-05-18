import fs from 'fs-extra';
await fs.emptyDir('./workspaces');
await fs.ensureFile('./workspaces/.gitkeep');
console.log('GitFusion workspaces cleaned.');
