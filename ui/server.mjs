#!/usr/bin/env node

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

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

function newJob(paths) {
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

  // v0: simulate scan work (replace with real scan pipeline)
  const steps = [
    'Indexing files…',
    'Extracting text (PPTX/XLSX/PDF/DOCX)…',
    'Finding repeated patterns…',
    'Drafting skill candidates…',
    'Writing indexfox_out/…',
    'Done.',
  ];

  let i = 0;
  const timer = setInterval(() => {
    i++;
    job.progress = Math.min(100, Math.floor((i / steps.length) * 100));
    job.message = steps[Math.min(i - 1, steps.length - 1)];
    if (i >= steps.length) {
      clearInterval(timer);
      job.status = 'done';
      job.finishedAt = Date.now();
    }
  }, 650);

  return job;
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);

    // API
    if (u.pathname === '/api/scan' && req.method === 'POST') {
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', () => {
        let body;
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          return send(res, 400, { 'content-type': 'application/json' }, JSON.stringify({ ok: false, error: 'invalid_json' }));
        }
        const paths = Array.isArray(body.paths) ? body.paths.filter(Boolean) : [];
        const job = newJob(paths);
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

    // Static
    let filePath = u.pathname === '/' ? '/index.html' : u.pathname;
    filePath = filePath.replace(/\.\.+/g, '.');
    const abs = path.join(publicDir, filePath);
    if (!abs.startsWith(publicDir)) return send(res, 403, { 'content-type': 'text/plain' }, 'Forbidden');

    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      return send(res, 404, { 'content-type': 'text/plain' }, 'Not found');
    }

    const buf = fs.readFileSync(abs);
    return send(res, 200, { 'content-type': contentType(abs) }, buf);
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
