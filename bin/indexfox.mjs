#!/usr/bin/env node

function help() {
  console.log(`IndexFox (v0)

Usage:
  indexfox serve
  indexfox scan --path <folder> [--path <folder> ...] [--out <folder>] [--json]

  indexfox skill draft --candidate <id> [--out <folder>] [--json]
  indexfox skill save --name <id> --stdin [--out <folder>] [--json]

  # legacy (interactive)
  indexfox skill coauthor [--candidate <id>]

Notes:
  - Outputs:
      - IDENTITY.md (visible)
      - skills/*.skill.md (final)
      - .indexfox/ (hidden cache)
  - BYOK for cloud LLM (not wired in v0 yet).
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    help();
    return;
  }

  const cmd = args[0];

  if (cmd === 'serve') {
    const { spawn } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const serverPath = fileURLToPath(new URL('../ui/server.mjs', import.meta.url));

    const p = spawn(process.execPath, [serverPath], {
      stdio: 'inherit',
      env: process.env,
    });

    p.on('exit', (code) => process.exit(code ?? 0));
    // Do not continue to other commands.
    return;
  }

  if (cmd === 'scan') {
    const { scan } = await import('../src/scan.mjs');
    const paths = [];
    let outDir = process.cwd();
    let jsonOnly = false;
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
      if (args[i] === '--json') jsonOnly = true;
    }
    if (!paths.length) {
      console.error('scan: provide at least one --path');
      process.exit(1);
    }
    const res = scan({ paths, outDir });
    const payload = { ok: true, outDir, totals: res.totals, candidates: res.candidates, identity: res.identity };
    console.log(JSON.stringify(payload, null, jsonOnly ? 0 : 2));
    return;
  }

  if (cmd === 'skill' && args[1] === 'draft') {
    const { findCandidate } = await import('../src/candidates_store.mjs');
    const { draftSkillMarkdown } = await import('../src/draft.mjs');

    let outDir = process.cwd();
    let candidateId = null;
    let jsonOnly = false;
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--candidate' && args[i + 1]) {
        candidateId = args[i + 1];
        i++;
        continue;
      }
      if (args[i] === '--out' && args[i + 1]) {
        outDir = args[i + 1];
        i++;
        continue;
      }
      if (args[i] === '--json') jsonOnly = true;
    }
    if (!candidateId) {
      console.error('skill draft: provide --candidate <id>');
      process.exit(1);
    }
    const c = await findCandidate(outDir, candidateId);
    if (!c) {
      console.error(`skill draft: candidate not found: ${candidateId} (out=${outDir})`);
      process.exit(1);
    }
    const md = draftSkillMarkdown({ id: c.id, name: c.name });
    if (jsonOnly) {
      console.log(JSON.stringify({ ok: true, candidate: { id: c.id, name: c.name }, markdown: md }));
    } else {
      process.stdout.write(md);
    }
    return;
  }

  if (cmd === 'skill' && args[1] === 'save') {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    let outDir = process.cwd();
    let name = null;
    let stdin = false;
    let jsonOnly = false;
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--name' && args[i + 1]) {
        name = args[i + 1];
        i++;
        continue;
      }
      if (args[i] === '--out' && args[i + 1]) {
        outDir = args[i + 1];
        i++;
        continue;
      }
      if (args[i] === '--stdin') stdin = true;
      if (args[i] === '--json') jsonOnly = true;
    }
    if (!name || !stdin) {
      console.error('skill save: require --name <id> --stdin');
      process.exit(1);
    }

    const chunks = [];
    for await (const ch of process.stdin) chunks.push(ch);
    const content = Buffer.concat(chunks).toString('utf8');

    const safe = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]+/g, '').slice(0, 64) || 'skill';
    const destDir = path.join(outDir, 'skills');
    await fs.mkdir(destDir, { recursive: true });
    const outPath = path.join(destDir, `${safe}.skill.md`);
    await fs.writeFile(outPath, content, 'utf8');

    const payload = { ok: true, outPath };
    console.log(JSON.stringify(payload, null, jsonOnly ? 0 : 2));
    return;
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
    return;
  }

  console.error(`Unknown command: ${args.join(' ')}`);
  help();
  process.exit(1);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
