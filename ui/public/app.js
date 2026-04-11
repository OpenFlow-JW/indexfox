const scanBtn = document.getElementById('scanBtn');
const demoBtn = document.getElementById('demoBtn');
const pathsEl = document.getElementById('paths');
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
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
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
    if (line.trim() === '') {
      out.push('<div style="height:8px"></div>');
    } else {
      out.push(`<p>${escapeHtml(line)}</p>`);
    }
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
  const list = (fileList || []).slice(0, 80);
  if (!list.length) {
    filesEl.appendChild(el('div', { class: 'hint' }, ['(no files preview)']));
    return;
  }
  for (const f of list) {
    const row = el('div', { class: 'fileRow' }, [
      el('div', { class: 'fileName' }, [f.name || '']),
      el('div', { class: 'fileMeta' }, [f.ext || '']),
    ]);
    filesEl.appendChild(row);
  }
}

function openEditor(candidate) {
  modal.innerHTML = '';
  modal.style.display = 'flex';

  const md0 = draftSkillMarkdown(candidate);

  const ta = el('textarea', { id: 'md', style: 'min-height:220px; font-family: var(--mono); font-size:12px;' }, []);
  ta.value = md0;

  const preview = el('div', {
    style:
      'border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:10px; background:rgba(0,0,0,0.18); color: var(--muted); overflow:auto; max-height:220px;',
  });
  preview.innerHTML = simpleMarkdownToHtml(md0);

  ta.addEventListener('input', () => {
    preview.innerHTML = simpleMarkdownToHtml(ta.value);
  });

  const chat = el('textarea', {
    id: 'chat',
    placeholder: 'AI와 함께 수정하기(coming soon). 예: "Guardrails를 더 구체적으로 써줘"',
    style: 'min-height:90px; font-family: var(--sans); font-size:12px;',
  });

  const card = el('div', { class: 'modalCard' }, [
    el('div', { class: 'modalTop' }, [
      el('div', {}, [el('strong', {}, [`Edit skill.md — ${candidate.name}`])]),
      el('button', { class: 'btn secondary', onClick: () => (modal.style.display = 'none') }, ['Close']),
    ]),
    el('div', { class: 'hint' }, ['Candidate를 클릭하면 초안이 열리고, 수정 후 바로 저장할 수 있어.']),
    el('div', { class: 'row', style: 'gap:12px; align-items:flex-start; margin-top:10px;' }, [
      el('div', { style: 'flex:1;' }, [el('label', {}, ['Markdown editor']), ta]),
      el('div', { style: 'flex:1;' }, [el('label', {}, ['Preview']), preview]),
    ]),
    el('div', { class: 'row', style: 'margin-top:10px; justify-content:flex-end;' }, [
      el('button', {
        class: 'btn',
        onClick: async () => {
          const content = ta.value;
          const r = await postJSON('/api/skill/save_markdown', { name: candidate.id, content });
          if (!r.ok) {
            alert(`Save failed: ${r.error || 'unknown_error'}`);
            return;
          }
          alert(`Saved!\n${r.outPath}`);
          modal.style.display = 'none';
        },
      }, ['Save skill.md']),
    ]),
    el('label', { style: 'margin-top:12px;' }, ['AI helper (next)']),
    chat,
    el('div', { class: 'hint' }, ['다음 단계에서 BYOK API Key를 넣고, 이 채팅이 “광역 업데이트/리라이팅”을 도와주게 만들 거야.']),
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
    const item = el('div', { class: 'cand' }, [
      el('div', { class: 'candTop' }, [
        el('div', {}, [
          el('div', { class: 'candTitle' }, [`${c.rank}. ${c.name}`]),
          el('div', { class: 'mono' }, [`id: ${c.id}  |  confidence: ${Math.round((c.confidence || 0) * 100)}%`]),
        ]),
        el('button', { class: 'btn', onClick: () => openEditor(c) }, ['Open']),
      ]),
      el('div', { class: 'hint' }, ['Evidence: ', (c.evidence || []).map((e) => e.file.split('/').slice(-1)[0]).join(', ') || '-']),
    ]);
    resultsEl.appendChild(item);
  }
}

demoBtn.addEventListener('click', () => {
  pathsEl.value = ['C:\\Users\\Me\\Downloads', 'C:\\Users\\Me\\Documents'].join('\n');
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
      setTimeout(tick, 250);
    } else {
      scanBtn.disabled = false;
      if (job.status === 'done') {
        setState('done', true);
        renderFileList(job.result?.fileList || []);
        renderCandidates(job.result?.candidates || []);
      }
    }
  };

  tick();
});
