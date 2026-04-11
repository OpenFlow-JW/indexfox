import fs from 'node:fs';
import path from 'node:path';

export function walkFiles(root, { maxFiles = 5000, exts = null } = {}) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const p = stack.pop();
    let st;
    try {
      st = fs.statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      let entries = [];
      try {
        entries = fs.readdirSync(p);
      } catch {
        continue;
      }
      for (const e of entries) {
        if (e === '.indexfox') continue;
        stack.push(path.join(p, e));
      }
    } else if (st.isFile()) {
      const ext = path.extname(p).toLowerCase();
      if (exts && !exts.includes(ext)) continue;
      out.push({
        path: p,
        ext,
        size: st.size,
        mtimeMs: st.mtimeMs,
      });
      if (out.length >= maxFiles) break;
    }
  }
  return out;
}
