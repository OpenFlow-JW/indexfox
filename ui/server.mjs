#!/usr/bin/env node

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import os from 'node:os';
import { execFile } from 'node:child_process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function contentType(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.json')) return 'application/json; charset=utf-8';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

// Very small in-memory job store (v0)
const jobs = new Map();

const CONFIG_PATH = path.join(os.homedir(), '.indexfox', 'config.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(cfg) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}


function outDir() {
  const cfg = readConfig();
  return cfg.outputDir || process.env.INDEXFOX_OUTDIR || process.cwd();
}

async function newJob(paths) {
  const id = Math.random().toString(16).slice(2);
  const job = {
    id,
    status: 'running',
    progress: 0,
    message: 'Starting…',
    paths,
    startedAt: Date.now(),
    finishedAt: null,
  };
  jobs.set(id, job);

  // v0: real scan (fast) + friendly progress messages
  const steps = [
    { p: 10, msg: 'Indexing files…' },
    { p: 35, msg: 'Extracting signals…' },
    { p: 60, msg: 'Finding patterns…' },
    { p: 80, msg: 'Drafting skill candidates…' },
    { p: 95, msg: 'Writing .indexfox/…' },
  ];

  // run in background
  (async () => {
    for (const s of steps) {
      job.progress = s.p;
      job.message = s.msg;
      // small delay for UI
      await new Promise((r) => setTimeout(r, 180));
    }

    try {
      const { scan } = await import('../src/scan.mjs');
      const res = scan({ paths, outDir: outDir() });
      job.result = { totals: res.totals, candidates: res.candidates, identity: res.identity, fileList: res.fileList };
      job.progress = 100;
      job.message = 'Done.';
      job.status = 'done';
      job.finishedAt = Date.now();
    } catch (e) {
      job.status = 'error';
      job.message = `Error: ${e?.message || e}`;
      job.finishedAt = Date.now();
    }
  })();

  return job;
}

async function newJobFromClientFiles(clientFiles) {
  const id = Math.random().toString(16).slice(2);
  const job = {
    id,
    status: 'running',
    progress: 0,
    message: 'Starting…',
    clientFilesCount: Array.isArray(clientFiles) ? clientFiles.length : 0,
    startedAt: Date.now(),
    finishedAt: null,
  };
  jobs.set(id, job);

  (async () => {
    try {
      job.progress = 35;
      job.message = 'Reading folder selection…';
      await new Promise((r) => setTimeout(r, 120));

      const { proposeCandidates } = await import('../src/candidates.mjs');
      const files = (Array.isArray(clientFiles) ? clientFiles : []).slice(0, 5000).map((f) => ({
        path: String(f.path || f.name || ''),
        ext: String(f.ext || '').toLowerCase(),
        size: Number(f.size || 0),
        mtimeMs: Number(f.mtimeMs || Date.now()),
      }));

      const candidates = proposeCandidates(files);
      job.result = {
        totals: { files: files.length },
        fileList: files.slice(0, 200).map((f) => ({ name: f.path.split(/[/\\]/).pop(), ext: f.ext })),
        candidates,
        identity: null,
      };

      job.progress = 100;
      job.message = 'Done.';
      job.status = 'done';
      job.finishedAt = Date.now();
    } catch (e) {
      job.status = 'error';
      job.message = `Error: ${e?.message || e}`;
      job.finishedAt = Date.now();
    }
  })();

  return job;
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);


    // API
    if (u.pathname === '/api/scan' && req.method === 'POST') {
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', async () => {
        let body;
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          return send(res, 400, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'invalid_json' }));
        }
        const paths = Array.isArray(body.paths) ? body.paths.filter(Boolean) : [];
        const job = await newJob(paths);
        return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify({ ok: true, jobId: job.id }));
      });
      return;
    }

    // Web folder picker flow (no path input): browser sends file list
    if (u.pathname === '/api/scan_files' && req.method === 'POST') {
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', async () => {
        let body;
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          return send(res, 400, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'invalid_json' }));
        }
        const files = Array.isArray(body.files) ? body.files : [];
        const job = await newJobFromClientFiles(files);
        return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify({ ok: true, jobId: job.id }));
      });
      return;
    }

    if (u.pathname.startsWith('/api/job/') && req.method === 'GET') {
      const id = u.pathname.split('/').pop();
      const job = jobs.get(id);
      if (!job) return send(res, 404, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'not_found' }));
      return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify({ ok: true, job }));
    }

    if (u.pathname === '/api/config' && req.method === 'GET') {
      const cfg = readConfig();
      // never echo apiKey by default (UI can indicate "set" state)
      const safe = { ...cfg };
      if (safe.apiKey) safe.apiKeySet = true;
      delete safe.apiKey;
      delete safe.apiKeyEnc;
      return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify({ ok: true, config: safe }));
    }

    if (u.pathname === '/api/config' && req.method === 'POST') {
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', () => {
        let body;
        try { body = raw ? JSON.parse(raw) : {}; } catch {
          return send(res, 400, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'invalid_json' }));
        }
        const cfg = readConfig();

        const next = {
          ...cfg,
          ...(body.outputDir ? { outputDir: String(body.outputDir) } : {}),
          ...(body.apiKey ? { apiKey: String(body.apiKey) } : {}),
        };

        writeConfig(next);
        return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify({ ok: true }));
      });
      return;
    }

    if (u.pathname === '/api/pick_folder' && req.method === 'POST') {
      // Windows FolderBrowserDialog via PowerShell (local runtime)
      if (process.platform !== 'win32') {
        return send(res, 501, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'picker_not_supported' }));
      }

      const ps = [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `$f = (New-Object -ComObject Shell.Application).BrowseForFolder(0,'Select a folder for IndexFox',0,0); if($f -ne $null){ $f.Self.Path }`,
      ];

      execFile('powershell.exe', ps, { timeout: 120000 }, (err, stdout, stderr) => {
        if (err) {
          return send(res, 500, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'picker_failed', details: String(stderr || '') }));
        }
        const picked = String(stdout || '').trim();
        return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify({ ok: true, path: picked }));
      });
      return;
    }

    if (u.pathname === '/api/mkdir' && req.method === 'POST') {
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', () => {
        let body;
        try { body = raw ? JSON.parse(raw) : {}; } catch {
          return send(res, 400, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'invalid_json' }));
        }
        const p = String(body.path || '').trim();
        if (!p) return send(res, 400, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'missing_path' }));
        try {
          fssync.mkdirSync(p, { recursive: true });
          return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify({ ok: true, path: p }));
        } catch (e) {
          return send(res, 500, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'mkdir_failed', details: e?.message || String(e) }));
        }
      });
      return;
    }

    if (u.pathname === '/api/identity' && req.method === 'GET') {
      const { identityPath, ensureIdentity } = await import('../src/identity.mjs');
      ensureIdentity(outDir());
      const p = identityPath(outDir());
      const text = fs.readFileSync(p, 'utf8');
      return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify({ ok: true, path: p, text }));
    }

    if (u.pathname === '/api/identity' && req.method === 'POST') {
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', async () => {
        let body;
        try { body = raw ? JSON.parse(raw) : {}; } catch {
          return send(res, 400, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'invalid_json' }));
        }
        const { identityPath, ensureIdentity } = await import('../src/identity.mjs');
        ensureIdentity(outDir());
        const p = identityPath(outDir());
        fs.writeFileSync(p, String(body.text || ''), 'utf8');
        return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify({ ok: true }));
      });
      return;
    }

    if (u.pathname === '/api/skills' && req.method === 'POST') {
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', async () => {
        let body;
        try { body = raw ? JSON.parse(raw) : {}; } catch {
          return send(res, 400, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'invalid_json' }));
        }
        const { coauthorSkill } = await import('../src/wizard_web.mjs');
        const r = await coauthorSkill({ outDir: outDir(), draft: body.draft || {} });
        return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify(r));
      });
      return;
    }

    if (u.pathname === '/api/skill/save_markdown' && req.method === 'POST') {
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', async () => {
        let body;
        try { body = raw ? JSON.parse(raw) : {}; } catch {
          return send(res, 400, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'invalid_json' }));
        }
        const name = String(body.name || 'skill').trim();
        const content = String(body.content || '');
        const safe = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]+/g, '').slice(0, 64) || 'skill';
        fs.mkdirSync(path.join(outDir(), 'skills'), { recursive: true });
        const outPath = path.join(outDir(), 'skills', `${safe}.skill.md`);
        fs.writeFileSync(outPath, content, 'utf8');
        return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify({ ok: true, outPath }));
      });
      return;
    }

    // Quick capture: paste/link → save as a note (local)
    if (u.pathname === '/api/note/save' && req.method === 'POST') {
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', () => {
        let body;
        try { body = raw ? JSON.parse(raw) : {}; } catch {
          return send(res, 400, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'invalid_json' }));
        }

        const title = String(body.title || '').trim() || 'Inbox note';
        const source = String(body.source || '').trim();
        const text = String(body.text || '').trim();

        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safe = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-가-힣]+/g, '').slice(0, 48) || 'note';

        const notesDir = path.join(outDir(), 'notes', 'inbox');
        fs.mkdirSync(notesDir, { recursive: true });
        const outPath = path.join(notesDir, `${stamp}__${safe}.md`);

        const fm = [
          '---',
          'type: note',
          'sensitivity: internal',
          `created: ${stamp.slice(0, 10)}`,
          source ? `source: ${JSON.stringify(source)}` : null,
          '---',
          '',
        ].filter(Boolean).join('\n');

        const content = `${fm}# ${title}\n\n${source ? `Source: ${source}\n\n` : ''}${text}\n`;
        fs.writeFileSync(outPath, content, 'utf8');

        return send(res, 200, { 'content-type': 'application/json' }, JSON.stringify({ ok: true, outPath }));
      });
      return;
    }

    // Static
    let filePath = u.pathname === '/' ? '/index.html' : u.pathname;
    filePath = filePath.replace(/\.\.+/g, '.');
    const abs = path.join(publicDir, filePath);
    if (!abs.startsWith(publicDir)) return send(res, 403, { 'content-type': 'text/plain' }, 'Forbidden');

    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      return send(res, 404, { 'content-type': 'text/plain' }, 'Not found');
    }

    const buf = fs.readFileSync(abs);
    return send(res, 200, { 'content-type': contentType(abs), 'cache-control': 'no-store' }, buf);
  } catch (e) {
    return send(res, 500, { 'content-type': 'text/plain' }, `Internal error\n${e?.stack || e}`);
  }
});

const preferred = process.env.INDEXFOX_PORT ? Number(process.env.INDEXFOX_PORT) : 4317;

function listen(p) {
  server.listen(p, '127.0.0.1', () => {
    console.log(`IndexFox UI running: http://127.0.0.1:${p}`);
  });
}

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    const fallback = preferred + 1;
    console.log(`Port ${preferred} in use, trying ${fallback}…`);
    listen(fallback);
    return;
  }
  throw err;
});

listen(preferred);
