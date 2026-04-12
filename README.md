# IndexFox

> **“Out of clutter, find simplicity.” — Steve Jobs**

IndexFox is a **local-first** CLI that scans your folders (Downloads/Documents/etc.) and helps you:

1) **Find knowledge** buried in documents
2) **Find workflows** you repeat
3) **Co-author skills** (guided Q&A) into reusable `skill.md`

> Viral-first premise: point IndexFox at a messy folder → get order, fast.

## What it does (v0)
- Pick one or more folders
- Index files (PPTX/XLSX/PDF/DOCX/MD/TXT)
- Propose **skill candidates**
- Start a guided Q&A (≈10 min) → finalize a reusable `skill.md`

### Outputs (kept minimal)
- `IDENTITY.md` (visible)
- `skills/*.skill.md` (final skills)
- `.indexfox/` (hidden cache: candidates/evidence/logs)

## Privacy / Data
- Local-first: outputs are written **only to your machine**.
- BYOK (bring your own key) for cloud LLM usage.
- Default sensitivity: `internal`.

## Requirements
- **Node.js 20+** (Windows/macOS/Linux)

## Quickstart (from source)
```bash
git clone https://github.com/OpenFlow-JW/indexfox.git
cd indexfox
npm install

# start local UI
node ./bin/indexfox.mjs serve
# open: http://127.0.0.1:4317
```

### Windows note (PowerShell)
If you see `running scripts is disabled`, run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## CLI (AI-friendly)
The CLI is designed to be called from tools like **Claude Code** / **Codex** (stable JSON output, file-based outputs).

```bash
# 1) scan a folder (writes outputs locally + prints JSON)
node ./bin/indexfox.mjs scan --path <folder> --out <outputDir> --json

# 2) draft a skill from a candidate (Markdown to stdout)
node ./bin/indexfox.mjs skill draft --candidate <id> --out <outputDir>

# 3) save a skill from stdin (useful for AI agents)
cat my.skill.md | node ./bin/indexfox.mjs skill save --name <id> --stdin --out <outputDir> --json
```

## Roadmap (short)
- Better PPTX/XLSX extraction
- Candidate dedupe + quality loop (internal harness)
- Optional: LLM-assisted rewrite (BYOK)

## IndexFox Team (Managed) (future)
IndexFox is optimized for individuals. A future **IndexFox Team (Managed)** offering would make it easy for a team/department to:
- Publish and host `skill.md` in a **shared space / registry** (a catalog teams can browse)
- Support a **marketplace-like contribution loop** (submit → review → merge)
- Provide **leaderboards / visibility** (most used, most copied, most improved skills)
- Manage submissions (ownership, permissions, versioning, audit)
- Dedupe similar skills and propose a standard (standardization loop)
- Produce lightweight weekly reports (what changed, what to standardize next)

**Likely “popular” categories:**
- Internal data access connectors (make private corp data usable to AI safely)
- Natural-language / voice control layers for existing tools (operate tools via Claude/LLM)

**Product ladder (proposed):**
- **IndexFox** (this repo): personal, local-first, Apache-2.0 OSS.
- **IndexFox Team (Managed)**: paid, hosted, and operated.
- **AFO (Enterprise)**: org-wide standardization + workflow composition + governance.

---

## Relationship to AFO
IndexFox helps you extract and co-author **skills** from messy folders.

When you’re ready, **AFO (Agent‑First Office)** can use those skills to compose larger workflows and standardize them at the org level:
- AFO repo: https://github.com/OpenFlow-JW/agent-first-office
