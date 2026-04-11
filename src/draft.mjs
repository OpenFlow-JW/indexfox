export function draftSkillMarkdown({ id, name }) {
  return `---
type: skill
id: skill.${id}
name: ${JSON.stringify(name)}
status: draft
version: 0.1.0
sensitivity: internal
source_candidate: ${JSON.stringify(id)}
inputs: []
output: "Markdown document"
parameters: []
---

# ${name}

## One-liner
(when you use it — one line)

## Inputs
- 

## Output
- 

## Parameters
- 

## Guardrails
- 

## Quality rubric
- [ ] 
`;
}
