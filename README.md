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

## CLI (optional)
```bash
# scan a folder (writes outputs locally)
node ./bin/indexfox.mjs scan --path <folder>

# co-author a skill in terminal
node ./bin/indexfox.mjs skill coauthor
```

## Roadmap (short)
- Better PPTX/XLSX extraction
- Role presets (PM/Marketing/Strategy/Ops/HR…)
- Export from Markdown → PPT outline / handoff message

---

## Relationship to AFO
IndexFox helps you extract and co-author **skills** from messy folders.

When you’re ready, **AFO (Agent‑First Office)** can use those skills to compose larger workflows and standardize them at the org level:
- AFO repo: https://github.com/OpenFlow-JW/agent-first-office
