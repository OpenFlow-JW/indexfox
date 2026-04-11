#!/usr/bin/env node

function help() {
  console.log(`IndexFox (v0)

Usage:
  indexfox serve
  indexfox scan --path <folder> [--path <folder> ...] [--out <folder>]
  indexfox skill init
  indexfox skill coauthor [--candidate <id>]

Notes:
  - Local-first outputs will be written under ./indexfox_out (default).
  - BYOK: set your LLM key in env vars when enabling cloud summarization.
`);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  help();
  process.exit(0);
}

const cmd = args[0];
if (cmd === 'serve') {
  const { spawn } = await import('node:child_process');
  const p = spawn(process.execPath, [new URL('../ui/server.mjs', import.meta.url).pathname], {
    stdio: 'inherit',
    env: process.env,
  });
  p.on('exit', (code) => process.exit(code ?? 0));
  process.exit(0);
}

if (cmd === 'scan') {
  const { scan } = await import('../src/scan.mjs');
  const paths = [];
  let outDir = process.cwd();
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) {
      paths.push(args[i + 1]);
      i++;
      continue;
    }
    if (args[i] === '--out' && args[i + 1]) {
      outDir = args[i + 1];
      i++;
      continue;
    }
  }
  if (!paths.length) {
    console.error('scan: provide at least one --path');
    process.exit(1);
  }
  const res = scan({ paths, outDir });
  console.log(JSON.stringify({ ok: true, totals: res.totals, candidates: res.candidates, identity: res.identity }, null, 2));
  process.exit(0);
}

if (cmd === 'skill' && args[1] === 'init') {
  // placeholder for future: pick candidate + start wizard
  console.log('skill init: use `indexfox skill coauthor` for now.');
  process.exit(0);
}

if (cmd === 'skill' && args[1] === 'coauthor') {
  const { coauthorSkill } = await import('../src/wizard.mjs');
  let candidateId = null;
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--candidate' && args[i + 1]) {
      candidateId = args[i + 1];
      i++;
    }
  }
  const r = await coauthorSkill({ outDir: process.cwd(), candidateId });
  console.log(`\nSaved: ${r.outPath}`);
  process.exit(0);
}

console.error(`Unknown command: ${args.join(' ')}`);
help();
process.exit(1);
