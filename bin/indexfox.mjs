#!/usr/bin/env node

function help() {
  console.log(`IndexFox (v0)

Usage:
  indexfox scan --path <folder> [--path <folder> ...]
  indexfox skill init

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
if (cmd === 'scan') {
  console.log('scan: not implemented yet (scaffold).');
  process.exit(0);
}

if (cmd === 'skill' && args[1] === 'init') {
  console.log('skill init: not implemented yet (scaffold).');
  process.exit(0);
}

console.error(`Unknown command: ${args.join(' ')}`);
help();
process.exit(1);
