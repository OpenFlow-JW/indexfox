const scanBtn = document.getElementById('scanBtn');
const demoBtn = document.getElementById('demoBtn');
const pathsEl = document.getElementById('paths');
const bar = document.getElementById('bar');
const msg = document.getElementById('msg');
const state = document.getElementById('state');
const roleSel = document.getElementById('role');
const resultsEl = document.getElementById('results');
const modal = document.getElementById('modal');

function setState(s, ok = false) {
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

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of children) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return n;
}

function openModal(candidate) {
  modal.innerHTML = '';
  modal.style.display = 'flex';

  const form = el('div', { class: 'modalCard' }, [
    el('div', { class: 'modalTop' }, [
      el('div', {}, [el('strong', {}, ['Co-author skill (≈10 min)'])]),
      el('button', { class: 'btn secondary', onClick: () => (modal.style.display = 'none') }, ['Close']),
    ]),

    el('div', { class: 'hint' }, [`Candidate: ${candidate.name} (${candidate.id})`]),

    el('label', {}, ['Skill name']),
    el('input', { id: 's_name', value: candidate.name }),

    el('label', {}, ['One-liner (when you use it)']),
    el('input', { id: 's_one', placeholder: 'e.g., 디자인팀에 요청서를 보낼 때' }),

    el('label', {}, ['Inputs (comma-separated, 3 max)']),
    el('input', { id: 's_in', placeholder: '요구사항 메모, 레퍼런스 링크, 일정' }),

    el('label', {}, ['Output (Markdown doc)']),
    el('input', { id: 's_out', value: `${candidate.name} (Markdown)` }),

    el('label', {}, ['Parameters (comma-separated, optional)']),
    el('input', { id: 's_params', placeholder: 'tone, length, audience' }),

    el('label', {}, ['Guardrails (2 items, separated by ;)']),
    el('input', { id: 's_guard', placeholder: '민감정보 포함 금지; 반려되는 흔한 이유는?' }),

    el('label', {}, ['Quality rubric (3 items, separated by ;)']),
    el('input', { id: 's_rubric', placeholder: '누락 없이 바로 견적 가능; 일정/범위 명확; 레퍼런스 포함' }),

    el('div', { class: 'row', style: 'margin-top:12px; justify-content:flex-end;' }, [
      el('button', {
        class: 'btn',
        onClick: async () => {
          const draft = {
            sourceCandidate: candidate.id,
            name: document.getElementById('s_name').value,
            oneLiner: document.getElementById('s_one').value,
            inputs: document.getElementById('s_in').value.split(',').map(s => s.trim()).filter(Boolean).slice(0,3),
            output: document.getElementById('s_out').value,
            parameters: document.getElementById('s_params').value.split(',').map(s => s.trim()).filter(Boolean).slice(0,5),
            guardrails: document.getElementById('s_guard').value.split(';').map(s => s.trim()).filter(Boolean).slice(0,5),
            rubric: document.getElementById('s_rubric').value.split(';').map(s => s.trim()).filter(Boolean).slice(0,7),
          };
          const r = await postJSON('/api/skills', { draft });
          if (!r.ok) {
            alert(`Failed: ${r.error || 'unknown_error'}`);
            return;
          }
          alert(`Saved!\n${r.outPath}`);
          modal.style.display = 'none';
        },
      }, ['Save skill.md']),
    ]),
  ]);

  modal.appendChild(form);
}

function renderCandidates(candidates) {
  resultsEl.innerHTML = '';
  if (!candidates || !candidates.length) {
    resultsEl.appendChild(el('div', { class: 'hint' }, ['No candidates yet.']));
    return;
  }

  for (const c of candidates) {
    const item = el('div', { class: 'cand' }, [
      el('div', { class: 'candTop' }, [
        el('div', {}, [
          el('div', { class: 'candTitle' }, [`${c.rank}. ${c.name}`]),
          el('div', { class: 'mono' }, [`id: ${c.id}  |  confidence: ${Math.round((c.confidence || 0) * 100)}%`]),
        ]),
        el('button', { class: 'btn', onClick: () => openModal(c) }, ['Co-author']),
      ]),
      el('div', { class: 'hint' }, ['Evidence (top 3): ', (c.evidence || []).map(e => e.file.split('/').slice(-1)[0]).join(', ') || '-']),
    ]);
    resultsEl.appendChild(item);
  }
}

async function loadIdentity() {
  const r = await getJSON('/api/identity');
  if (!r.ok) return;
  // super-light: try to infer primary_role line
  const m = String(r.text || '').match(/primary_role:\s*(.+)/);
  if (m && m[1] && m[1].trim() !== 'unknown') {
    roleSel.value = m[1].trim().replace(/['"]/g, '');
  }
}

async function saveIdentityRole(role) {
  const r = await getJSON('/api/identity');
  if (!r.ok) return;
  const lines = String(r.text || '').split('\n');
  const out = lines.map((ln) => (ln.startsWith('primary_role:') ? `primary_role: ${role}` : ln)).join('\n');
  await postJSON('/api/identity', { text: out });
}

roleSel.addEventListener('change', () => saveIdentityRole(roleSel.value));

demoBtn.addEventListener('click', () => {
  pathsEl.value = ['/Users/me/Downloads', '/Users/me/Documents'].join('\n');
});

scanBtn.addEventListener('click', async () => {
  const paths = pathsEl.value.split('\n').map((s) => s.trim()).filter(Boolean);
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

    if (job.status !== 'done' && job.status !== 'error') {
      setTimeout(tick, 350);
    } else {
      scanBtn.disabled = false;
      if (job.status === 'done') {
        setState('done', true);
        renderCandidates(job.result?.candidates || []);
      }
    }
  };

  tick();
});

loadIdentity();
