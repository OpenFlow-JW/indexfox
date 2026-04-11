import path from 'node:path';
import fs from 'node:fs';
import { scan } from '../src/scan.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT_FAIL: ${msg}`);
}

const fixtureDir = path.join(process.cwd(), 'harness', 'fixtures', 'simple');
const tmpOut = path.join(process.cwd(), '.tmp_harness_out');
fs.rmSync(tmpOut, { recursive: true, force: true });
fs.mkdirSync(tmpOut, { recursive: true });

const res = scan({ paths: [fixtureDir], outDir: tmpOut });

assert(res.ok === true, 'scan ok');
assert(res.totals.files >= 1, 'should find files');
assert(Array.isArray(res.candidates) && res.candidates.length >= 1, 'should propose candidates');

const ids = res.candidates.map((c) => c.id);
assert(ids.includes('design_request') || ids.includes('general_doc_skill'), 'should include design_request candidate');

console.log('HARNESS_OK');
console.log(JSON.stringify({ totals: res.totals, candidates: res.candidates.slice(0, 3) }, null, 2));
