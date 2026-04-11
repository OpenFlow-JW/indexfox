import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadCandidates(outDir) {
  const p = path.join(outDir, '.indexfox', 'candidates.json');
  const t = await fs.readFile(p, 'utf8');
  return JSON.parse(t);
}

export async function findCandidate(outDir, id) {
  const list = await loadCandidates(outDir);
  const c = (list || []).find((x) => x.id === id);
  return c || null;
}
