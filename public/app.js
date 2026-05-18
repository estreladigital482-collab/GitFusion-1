const $ = (id) => document.getElementById(id);
const API_BASE = window.GITFUSION_API_BASE || '';
const state = { jobId: null, repos: [], logs: [] };

function appendLogs(lines) {
  state.logs.push(...lines);
  $('logBox').textContent = state.logs.join('\n');
  $('logBox').scrollTop = $('logBox').scrollHeight;
}
function setLogs(lines) { state.logs = lines; $('logBox').textContent = lines.join('\n'); }
function repoLines() {
  return $('reposInput').value.split('\n').map(x => x.trim()).filter(Boolean);
}
function renderRepos() {
  const box = $('repoList');
  if (!state.repos.length) {
    box.className = 'repo-list empty';
    box.textContent = 'Nenhum repositório analisado ainda.';
    return;
  }
  box.className = 'repo-list';
  box.innerHTML = state.repos.map((repo, index) => `
    <div class="repo-card">
      <strong>${repo.owner}/${repo.repo}</strong>
      <small>${repo.fileCount} arquivos · branch ${repo.branch}</small>
      <div class="badges">
        ${(repo.stack.length ? repo.stack : ['Stack não detectada']).map(s => `<span class="badge">${s}</span>`).join('')}
      </div>
    </div>
  `).join('');

  $('baseSelect').disabled = false;
  $('baseSelect').innerHTML = state.repos.map((repo, i) => `<option value="${i}">${repo.owner}/${repo.repo}</option>`).join('');
  $('fuseBtn').disabled = false;
}
async function requestJson(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erro HTTP ${response.status}`);
  return data;
}

$('healthBtn').addEventListener('click', async () => {
  try {
    const data = await requestJson('/api/health');
    appendLogs([`health: ${data.name} online em ${data.time}`]);
  } catch (error) { appendLogs([`health-error: ${error.message}`]); }
});

$('clearBtn').addEventListener('click', () => {
  $('reposInput').value = '';
  state.jobId = null; state.repos = []; setLogs(['[idle] aguardando repositórios...']); renderRepos();
  $('downloadLink').classList.add('disabled'); $('downloadLink').href = '#';
});

$('analyzeBtn').addEventListener('click', async () => {
  const repos = repoLines();
  if (repos.length < 2) return appendLogs(['error: informe pelo menos 2 URLs do GitHub.']);
  $('analyzeBtn').disabled = true;
  setLogs(['scan: iniciando análise real...', `input: ${repos.length} repositórios`]);
  try {
    const data = await requestJson('/api/analyze', { method: 'POST', body: JSON.stringify({ repos }) });
    state.jobId = data.jobId;
    state.repos = data.repos;
    setLogs(data.logs);
    renderRepos();
  } catch (error) {
    appendLogs([`error: ${error.message}`]);
  } finally { $('analyzeBtn').disabled = false; }
});

$('fuseBtn').addEventListener('click', async () => {
  if (!state.jobId) return appendLogs(['error: analise os repositórios primeiro.']);
  $('fuseBtn').disabled = true;
  appendLogs(['fusion: preparando projeto consolidado...']);
  try {
    const data = await requestJson('/api/fuse', {
      method: 'POST',
      body: JSON.stringify({ jobId: state.jobId, baseIndex: $('baseSelect').value, projectName: $('projectName').value })
    });
    setLogs(data.logs);
    $('downloadLink').href = `${API_BASE}${data.downloadUrl}`;
    $('downloadLink').classList.remove('disabled');
    appendLogs(['ready: ZIP disponível no botão Baixar ZIP.']);
  } catch (error) { appendLogs([`error: ${error.message}`]); }
  finally { $('fuseBtn').disabled = false; }
});

// Minimal animated wireframe void background.
const canvas = $('voidGrid');
const ctx = canvas.getContext('2d');
let w, h, t = 0;
function resize() { w = canvas.width = innerWidth * devicePixelRatio; h = canvas.height = innerHeight * devicePixelRatio; }
addEventListener('resize', resize); resize();
function draw() {
  t += 0.006;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(210,255,242,0.12)';
  ctx.lineWidth = devicePixelRatio;
  const gap = 38 * devicePixelRatio;
  const midX = w * .5, midY = h * .46;
  for (let y = -gap; y < h + gap; y += gap) {
    ctx.beginPath();
    for (let x = -gap; x < w + gap; x += gap) {
      const dx = (x - midX) / w;
      const dy = (y - midY) / h;
      const wave = Math.sin(dx * 10 + t * 3) * Math.cos(dy * 8 - t * 2) * 18 * devicePixelRatio;
      const yy = y + wave + Math.sin((x * .004) + t) * 8 * devicePixelRatio;
      if (x === -gap) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  for (let x = -gap; x < w + gap; x += gap) {
    ctx.beginPath();
    for (let y = -gap; y < h + gap; y += gap) {
      const wave = Math.sin(y * .006 + t * 2) * 11 * devicePixelRatio;
      const xx = x + wave;
      if (y === -gap) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
  requestAnimationFrame(draw);
}
draw();
