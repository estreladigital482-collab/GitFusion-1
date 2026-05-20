const base = process.env.GITFUSION_BASE_URL || 'http://127.0.0.1:3737';
const res = await fetch(`${base}/api/brain/local/status`);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
