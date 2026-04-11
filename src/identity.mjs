import fs from 'node:fs';
import path from 'node:path';

export function identityPath(outDir) {
  return path.join(outDir, 'IDENTITY.md');
}

export function ensureIdentity(outDir) {
  const p = identityPath(outDir);
  if (fs.existsSync(p)) return { created: false, path: p };

  const content = `---
# IndexFox IDENTITY
# Edit this anytime. IndexFox will use it to tailor questions/templates.

type: identity
primary_role: unknown
secondary_roles: []
sensitivity: internal
---

# IDENTITY

## Primary role
- unknown

## What I do (1-2 lines)
- 

## Common outputs
- 

## Common collaborators
- 
`;

  fs.writeFileSync(p, content, 'utf8');
  return { created: true, path: p };
}
