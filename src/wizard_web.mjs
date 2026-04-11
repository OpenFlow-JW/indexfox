import fs from 'node:fs';
import path from 'node:path';

export async function coauthorSkill({ outDir = process.cwd(), draft = {} }) {
  const name = String(draft.name || '').trim();
  const oneLiner = String(draft.oneLiner || '').trim();
  const inputs = Array.isArray(draft.inputs) ? draft.inputs.map(String).map(s=>s.trim()).filter(Boolean).slice(0,3) : [];
  const output = String(draft.output || '').trim();
  const parameters = Array.isArray(draft.parameters) ? draft.parameters.map(String).map(s=>s.trim()).filter(Boolean).slice(0,5) : [];
  const guardrails = Array.isArray(draft.guardrails) ? draft.guardrails.map(String).map(s=>s.trim()).filter(Boolean).slice(0,5) : [];
  const rubric = Array.isArray(draft.rubric) ? draft.rubric.map(String).map(s=>s.trim()).filter(Boolean).slice(0,7) : [];
  const sourceCandidate = draft.sourceCandidate ? String(draft.sourceCandidate) : null;

  if (!name || !oneLiner || !output) {
    return { ok: false, error: 'missing_required_fields' };
  }

  const safeId = (sourceCandidate || name)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-가-힣]+/g, '')
    .slice(0, 64);

  const fm = {
    type: 'skill',
    id: `skill.${safeId}`,
    name,
    status: 'active',
    version: '0.1.0',
    sensitivity: 'internal',
    source_candidate: sourceCandidate,
    inputs,
    output,
    parameters,
  };

  const frontmatter = `---\n${Object.entries(fm)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v)}`)
    .join('\n')}\n---\n`;

  const md = `${frontmatter}

# ${name}

## One-liner
${oneLiner}

## Inputs
${inputs.map((i) => `- ${i}`).join('\n')}

## Output
- ${output}

## Parameters
${parameters.map((p) => `- ${p}`).join('\n')}

## Guardrails
${guardrails.map((g) => `- ${g}`).join('\n')}

## Quality rubric
${rubric.map((r) => `- [ ] ${r}`).join('\n')}
`;

  fs.mkdirSync(path.join(outDir, 'skills'), { recursive: true });
  const outPath = path.join(outDir, 'skills', `${safeId}.skill.md`);
  fs.writeFileSync(outPath, md, 'utf8');
  return { ok: true, outPath };
}
