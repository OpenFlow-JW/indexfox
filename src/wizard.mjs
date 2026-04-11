import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

function ask(rl, q) {
  return new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));
}

export async function coauthorSkill({ outDir = process.cwd(), candidateId = null }) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\nIndexFox Skill Co-author (v0)');
  console.log('Goal: finalize one skill.md in ~10 minutes.\n');

  const name = await ask(rl, 'Skill name (e.g., "디자인 의뢰서 작성"): ');
  const oneLiner = await ask(rl, 'One-liner (when you use it): ');
  const inputs = await ask(rl, 'Inputs (comma-separated, 3 max): ');
  const outputs = await ask(rl, 'Output (what Markdown doc is produced?): ');
  const params = await ask(rl, 'Parameters (comma-separated, optional): ');

  console.log('\nGuardrails (answer briefly)');
  const g1 = await ask(rl, '1) What must NOT happen? ');
  const g2 = await ask(rl, '2) What usually causes rework/rejection? ');

  console.log('\nQuality rubric (3 quick checks)');
  const r1 = await ask(rl, '1) Good output means… ');
  const r2 = await ask(rl, '2) Another check… ');
  const r3 = await ask(rl, '3) Another check… ');

  rl.close();

  const safeId = (candidateId || name || 'skill')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-]+/g, '')
    .slice(0, 64);

  const md = `---
type: skill
id: skill.${safeId}
name: "${name || safeId}"
status: active
version: 0.1.0
sensitivity: internal
source_candidate: ${candidateId ? JSON.stringify(candidateId) : 'null'}
inputs: ${JSON.stringify(inputs ? inputs.split(',').map(s=>s.trim()).filter(Boolean).slice(0,3) : [], null, 0)}
output: ${JSON.stringify(outputs || '')}
parameters: ${JSON.stringify(params ? params.split(',').map(s=>s.trim()).filter(Boolean).slice(0,5) : [], null, 0)}
---

# ${name || safeId}

## One-liner
${oneLiner || ''}

## Inputs
${(inputs ? inputs.split(',').map(s=>s.trim()).filter(Boolean).slice(0,3) : []).map(i=>`- ${i}`).join('\n')}

## Output
- ${outputs || ''}

## Parameters
${(params ? params.split(',').map(s=>s.trim()).filter(Boolean).slice(0,5) : []).map(p=>`- ${p}`).join('\n')}

## Guardrails
- ${g1 || ''}
- ${g2 || ''}

## Quality rubric
- [ ] ${r1 || ''}
- [ ] ${r2 || ''}
- [ ] ${r3 || ''}
`;

  const outPath = path.join(outDir, 'skills', `${safeId}.skill.md`);
  fs.writeFileSync(outPath, md, 'utf8');
  return { ok: true, outPath };
}
