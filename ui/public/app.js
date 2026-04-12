const pickBtn = document.getElementById('pickBtn');
const bar = document.getElementById('bar');
const msg = document.getElementById('msg');
const state = document.getElementById('state');
const resultsEl = document.getElementById('results');
const filesEl = document.getElementById('files');
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
    else if (k === 'style') n.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of children) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return n;
}

function escapeHtml(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function simpleMarkdownToHtml(md) {
  const lines = String(md).split('\n');
  const out = [];
  let inList = false;
  for (const line of lines) {
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      const level = h[1].length;
      out.push(`<h${level}>${escapeHtml(h[2])}</h${level}>`);
      continue;
    }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${escapeHtml(li[1])}</li>`);
      continue;
    }
    if (inList && line.trim() === '') {
      out.push('</ul>');
      inList = false;
      continue;
    }
    if (line.trim() === '') out.push('<div style="height:8px"></div>');
    else out.push(`<p>${escapeHtml(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function draftSkillMarkdown(candidate) {
  return `---
type: skill
id: skill.${candidate.id}
name: ${JSON.stringify(candidate.name)}
status: draft
version: 0.1.0
sensitivity: internal
source_candidate: ${JSON.stringify(candidate.id)}
inputs: []
output: "Markdown document"
parameters: []
---

# ${candidate.name}

## One-liner
(언제 쓰는지 한 줄)

## Inputs
- 

## Output
- 

## Parameters
- 

## Guardrails
- 

## Quality rubric
- [ ] 
`;
}

function renderFileList(fileList) {
  filesEl.innerHTML = '';
  const list = (fileList || []).slice(0, 120);
  if (!list.length) {
    filesEl.appendChild(el('div', { class: 'hint' }, ['(no files preview)']));
    return;
  }
  for (const f of list) {
    filesEl.appendChild(
      el('div', { class: 'fileRow' }, [
        el('div', { class: 'fileName' }, [f.name || '']),
        el('div', { class: 'fileMeta' }, [f.ext || '']),
      ])
    );
  }
}

function openEditor(candidate) {
  modal.innerHTML = '';
  modal.style.display = 'flex';

  const md0 = draftSkillMarkdown(candidate);
  const ta = el('textarea', { style: 'min-height:240px; font-family: var(--mono); font-size:12px;' });
  ta.value = md0;

  const preview = el('div', {
    style:
      'border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:10px; background:rgba(0,0,0,0.18); color: var(--muted); overflow:auto; max-height:240px;',
  });
  preview.innerHTML = simpleMarkdownToHtml(md0);

  ta.addEventListener('input', () => {
    preview.innerHTML = simpleMarkdownToHtml(ta.value);
  });

  const chat = el('textarea', {
    placeholder: 'AI chat (next). 예: "이 스킬을 더 구체화해줘"',
    style: 'min-height:90px; font-family: var(--sans); font-size:12px;',
  });

  const card = el('div', { class: 'modalCard' }, [
    el('div', { class: 'modalTop' }, [
      el('div', {}, [el('strong', {}, [`Edit skill.md — ${candidate.name}`])]),
      el('button', { class: 'btn secondary', onClick: () => (modal.style.display = 'none') }, ['Close']),
    ]),
    el('div', { class: 'row', style: 'gap:12px; align-items:flex-start; margin-top:10px;' }, [
      el('div', { style: 'flex:1;' }, [el('label', {}, ['Markdown editor']), ta]),
      el('div', { style: 'flex:1;' }, [el('label', {}, ['Preview']), preview]),
    ]),
    el('div', { class: 'row', style: 'margin-top:10px; justify-content:flex-end;' }, [
      el(
        'button',
        {
          class: 'btn',
          onClick: async () => {
            const r = await postJSON('/api/skill/save_markdown', { name: candidate.id, content: ta.value });
            if (!r.ok) return alert(`Save failed: ${r.error || 'unknown_error'}`);
            alert(`Saved!\n${r.outPath}`);
            modal.style.display = 'none';
          },
        },
        ['Save skill.md']
      ),
    ]),
    el('label', { style: 'margin-top:12px;' }, ['AI helper (next)']),
    chat,
    el('div', { class: 'hint' }, ['Setup에서 API Key를 넣으면, 여기서 AI로 광역 수정/리라이팅을 하게 만들 거야.']),
  ]);

  modal.appendChild(card);
}

function renderCandidates(candidates) {
  resultsEl.innerHTML = '';
  if (!candidates || !candidates.length) {
    resultsEl.appendChild(el('div', { class: 'hint' }, ['No candidates yet.']));
    return;
  }

  for (const c of candidates) {
    resultsEl.appendChild(
      el('div', { class: 'cand' }, [
        el('div', { class: 'candTop' }, [
          el('div', {}, [
            el('div', { class: 'candTitle' }, [`${c.rank}. ${c.name}`]),
            el('div', { class: 'mono' }, [`id: ${c.id}  |  confidence: ${Math.round((c.confidence || 0) * 100)}%`]),
          ]),
          el('button', { class: 'btn', onClick: () => openEditor(c) }, ['Open']),
        ]),
      ])
    );
  }
}

async function ensureSetup() {
  const r = await getJSON('/api/config');
  const cfg = r.ok ? r.config : {};
  const needs = !cfg.outputDir;
  if (!needs) return;

  modal.innerHTML = '';
  modal.style.display = 'flex';

  const outputDirEl = el('input', { placeholder: 'Output folder (e.g., C:\\Users\\You\\IndexFox_Out)' });
  outputDirEl.value = cfg.outputDir || '';

  const errEl = el('div', { class: 'hint', style: 'color:#B91C1C; display:none; margin-top:6px;' }, ['']);

  const card = el('div', { class: 'modalCard' }, [
    el('div', { class: 'modalTop' }, [el('strong', {}, ['IndexFox setup (one-time)'])]),
    el('div', { class: 'hint' }, ['Choose output folder (IndexFox writes everything locally there).']),
    el('div', { class: 'row' }, [
      outputDirEl,
      el('button', {
        class: 'btn secondary',
        onClick: async () => {
          const p = await postJSON('/api/pick_folder', {});
          if (p.ok && p.path) {
            outputDirEl.value = p.path;
            errEl.style.display = 'none';
          } else {
            errEl.textContent = `Pick failed: ${p.error || 'unknown'} ${p.details ? `(${p.details})` : ''}`;
            errEl.style.display = 'block';
          }
        },
      }, ['Pick…']),
    ]),
    errEl,
    el('div', { class: 'row', style: 'margin-top:12px; justify-content:flex-end;' }, [
      el('button', {
        class: 'btn',
        onClick: async () => {
          const out = outputDirEl.value.trim();
          if (!out) return alert('Choose an output folder.');
          const r2 = await postJSON('/api/config', { outputDir: out });
          if (!r2.ok) return alert(r2.error || 'Failed to save config');
          modal.style.display = 'none';
        },
      }, ['Save setup']),
    ]),
  ]);

  modal.appendChild(card);
}

async function runScan() {
  setState('starting…');
  setProgress(0);
  msg.textContent = 'Select a folder…';

  const picked = await postJSON('/api/pick_folder', {});
  if (!picked.ok || !picked.path) {
    setState('error');
    msg.textContent = 'Folder picking cancelled/failed.';
    return;
  }

  const start = await postJSON('/api/scan', { paths: [picked.path] });
  if (!start.ok) {
    msg.textContent = `Failed: ${start.error || 'unknown_error'}`;
    setState('error');
    return;
  }

  const jobId = start.jobId;
  const tick = async () => {
    const r = await getJSON(`/api/job/${jobId}`);
    if (!r.ok) {
      msg.textContent = 'Job not found.';
      setState('error');
      return;
    }
    const job = r.job;
    msg.textContent = job.message;
    setProgress(job.progress);
    setState(job.status);
    if (job.status !== 'done' && job.status !== 'error') setTimeout(tick, 250);
    else if (job.status === 'done') {
      setState('done', true);
      renderFileList(job.result?.fileList || []);
      renderCandidates(job.result?.candidates || []);
    }
  };
  tick();
}

pickBtn.addEventListener('click', runScan);

// Quick capture
const capTitle = document.getElementById('capTitle');
const capSource = document.getElementById('capSource');
const capText = document.getElementById('capText');
const capSave = document.getElementById('capSave');
capSave.addEventListener('click', async () => {
  const title = capTitle.value.trim();
  const source = capSource.value.trim();
  const text = capText.value.trim();
  if (!text) return alert('Paste some text first.');
  const r = await postJSON('/api/note/save', { title, source, text });
  if (!r.ok) return alert(`Save failed: ${r.error || 'unknown_error'}`);
  alert(`Saved note:\n${r.outPath}`);
  capTitle.value = '';
  capSource.value = '';
  capText.value = '';
});

ensureSetup();
