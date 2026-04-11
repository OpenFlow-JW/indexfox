import fs from 'node:fs';
import path from 'node:path';
import { walkFiles } from './fs_walk.mjs';
import { proposeCandidates } from './candidates.mjs';
import { ensureIdentity } from './identity.mjs';

const DEFAULT_EXTS = ['.pptx', '.xlsx', '.pdf', '.docx', '.md', '.txt'];

export function scan({ paths, outDir = process.cwd(), maxFiles = 3000 }) {
  const hiddenDir = path.join(outDir, '.indexfox');
  fs.mkdirSync(hiddenDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'skills'), { recursive: true });

  const identity = ensureIdentity(outDir);

  const files = [];
  for (const p of paths) {
    try {
      const st = fs.statSync(p);
      if (!st.isDirectory()) continue;
      files.push(...walkFiles(p, { maxFiles, exts: DEFAULT_EXTS }));
    } catch {
      // ignore
    }
  }

  const candidates = proposeCandidates(files);

  const index = {
    ok: true,
    scannedPaths: paths,
    exts: DEFAULT_EXTS,
    totals: {
      files: files.length,
    },
    identity,
    candidates,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(hiddenDir, 'scan.json'), JSON.stringify(index, null, 2));
  fs.writeFileSync(path.join(hiddenDir, 'candidates.json'), JSON.stringify(candidates, null, 2));

  return index;
}
