const pickBtn = document.getElementById('pickBtn');
const folderInput = document.getElementById('folderInput');
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

  const ta = el('textarea', { id: 'md', style: 'min-height:240px; font-family: var(--mono); font-size:12px;' });
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
    id: 'chat',
    placeholder: 'AI와 함께 수정하기(coming soon). 예: "Guardrails를 더 구체적으로 써줘"',
    style: 'min-height:90px; font-family: var(--sans); font-size:12px;',
  });

  const card = el('div', { class: 'modalCard' }, [
    el('div', { class: 'modalTop' }, [
      el('div', {}, [el('strong', {}, [`Edit skill.md — ${candidate.name}`])]),
      el('button', { class: 'btn secondary', onClick: () => (modal.style.display = 'none') }, ['Close']),
    ]),
    el('div', { class: 'hint' }, ['초안이 열렸어. 수정하고 Save 누르면 skills/에 저장돼.']),
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
    el('div', { class: 'hint' }, ['다음 단계에서 API Key(BYOK) 넣고, 이 영역으로 “광역 업데이트/리라이팅”을 하게 만들 거야.']),
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
        el('div', { class: 'hint' }, ['Evidence: ', (c.evidence || []).map((e) => String(e.file).split(/[/\\]/).pop()).join(', ') || '-']),
      ])
    );
  }
}

async function runScanFromFolderSelection(fileList) {
  setState('starting…');
  setProgress(0);
  msg.textContent = 'Starting scan…';

  const files = Array.from(fileList).slice(0, 5000).map((f) => {
    const rel = f.webkitRelativePath || f.name;
    const ext = ('.' + (f.name.split('.').pop() || '')).toLowerCase();
    return { path: rel, name: f.name, ext, size: f.size };
  });

  // show immediate preview (names)
  renderFileList(files.map((f) => ({ name: f.path, ext: f.ext })));

  const start = await postJSON('/api/scan_files', { files });
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

    if (job.status !== 'done' && job.status !== 'error') setTimeout(tick, 200);
    else if (job.status === 'done') {
      setState('done', true);
      renderCandidates(job.result?.candidates || []);
    }
  };

  tick();
}

pickBtn.addEventListener('click', () => folderInput.click());
folderInput.addEventListener('change', () => {
  if (!folderInput.files || folderInput.files.length === 0) return;
  runScanFromFolderSelection(folderInput.files);
});
