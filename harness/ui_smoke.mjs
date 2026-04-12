import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT_FAIL: ${msg}`);
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitFor(fn, { timeoutMs = 8000, intervalMs = 200 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const v = await fn();
    if (v) return v;
    await sleep(intervalMs);
  }
  return null;
}

const port = 4567;
const base = `http://127.0.0.1:${port}`;

const tmpRoot = path.join(process.cwd(), '.tmp_ui_smoke');
await fs.rm(tmpRoot, { recursive: true, force: true });
await fs.mkdir(tmpRoot, { recursive: true });

// fixture folder to scan
const scanDir = path.join(tmpRoot, 'scan');
await fs.mkdir(scanDir, { recursive: true });
await fs.writeFile(path.join(scanDir, 'Design_Request_Brief.md'), '# 디자인 의뢰서\n요청...', 'utf8');
await fs.writeFile(path.join(scanDir, 'Weekly_shipment_plan.xlsx'), '(placeholder)', 'utf8');

// output folder
const outDir = path.join(tmpRoot, 'out');
await fs.mkdir(outDir, { recursive: true });

const child = spawn(process.execPath, [path.join('ui', 'server.mjs')], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    INDEXFOX_PORT: String(port),
    INDEXFOX_OUTDIR: outDir,
  },
});

let logs = '';
child.stdout.on('data', (d) => (logs += d.toString()));
child.stderr.on('data', (d) => (logs += d.toString()));

const ready = await waitFor(async () => logs.includes('IndexFox UI running'), { timeoutMs: 8000 });
assert(ready, 'server should start');

// config set (output folder only)
{
  const res = await fetch(`${base}/api/config`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ outputDir: outDir }),
  });
  const j = await res.json();
  assert(j.ok === true, 'config post ok');
}

// scan
let jobId;
{
  const res = await fetch(`${base}/api/scan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ paths: [scanDir] }),
  });
  const j = await res.json();
  assert(j.ok === true && j.jobId, 'scan start ok');
  jobId = j.jobId;
}

// poll
let job;
for (let i = 0; i < 60; i++) {
  const res = await fetch(`${base}/api/job/${jobId}`);
  const j = await res.json();
  assert(j.ok === true, 'job get ok');
  job = j.job;
  if (job.status === 'done') break;
  if (job.status === 'error') throw new Error(`job error: ${job.message}`);
  await sleep(150);
}
assert(job && job.status === 'done', 'job should finish');
assert(job.result && Array.isArray(job.result.candidates) && job.result.candidates.length >= 1, 'candidates exist');

// save markdown
{
  const content = '# Test Skill\n\n- hello';
  const res = await fetch(`${base}/api/skill/save_markdown`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'test_skill', content }),
  });
  const j = await res.json();
  assert(j.ok === true && j.outPath, 'save ok');
  const saved = await fs.readFile(j.outPath, 'utf8');
  assert(saved.includes('Test Skill'), 'saved content');
}

// quick capture note
{
  const res = await fetch(`${base}/api/note/save`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Inbox note', source: 'https://example.com', text: 'hello world' }),
  });
  const j = await res.json();
  assert(j.ok === true && j.outPath, 'note save ok');
  const saved = await fs.readFile(j.outPath, 'utf8');
  assert(saved.includes('hello world'), 'note content');
}

child.kill('SIGTERM');
await fs.rm(tmpRoot, { recursive: true, force: true });

console.log('UI_SMOKE_OK');
