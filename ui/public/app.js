const scanBtn = document.getElementById('scanBtn');
const demoBtn = document.getElementById('demoBtn');
const pathsEl = document.getElementById('paths');
const bar = document.getElementById('bar');
const msg = document.getElementById('msg');
const state = document.getElementById('state');

function setState(s, ok=false) {
  state.textContent = s;
  state.className = ok ? 'pill ok' : 'pill';
}

function setProgress(p) {
  bar.style.width = `${Math.max(0, Math.min(100, p))}%`;
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return await res.json();
}

async function getJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

demoBtn.addEventListener('click', () => {
  pathsEl.value = ['/Users/me/Downloads', '/Users/me/Documents'].join('\n');
});

scanBtn.addEventListener('click', async () => {
  const paths = pathsEl.value.split('\n').map(s => s.trim()).filter(Boolean);
  if (!paths.length) {
    msg.textContent = 'Add at least one folder path.';
    return;
  }

  scanBtn.disabled = true;
  setState('starting…');
  setProgress(0);
  msg.textContent = 'Starting scan…';

  const start = await postJSON('/api/scan', { paths });
  if (!start.ok) {
    msg.textContent = `Failed: ${start.error || 'unknown_error'}`;
    setState('error');
    scanBtn.disabled = false;
    return;
  }

  const jobId = start.jobId;

  const tick = async () => {
    const r = await getJSON(`/api/job/${jobId}`);
    if (!r.ok) {
      msg.textContent = 'Job not found.';
      setState('error');
      scanBtn.disabled = false;
      return;
    }

    const job = r.job;
    msg.textContent = job.message;
    setProgress(job.progress);
    setState(job.status);

    if (job.status !== 'done') {
      setTimeout(tick, 500);
    } else {
      setState('done', true);
      msg.textContent = 'Done. (v0 preview)';
      scanBtn.disabled = false;
    }
  };

  tick();
});
