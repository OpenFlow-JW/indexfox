# IndexFox

> **“Out of clutter, find simplicity.” — Steve Jobs**

IndexFox is a **local-first** CLI that scans your folders (Downloads/Documents/etc.) and helps you:

1) **Find knowledge** buried in documents
2) **Find workflows** you repeat
3) **Co-author skills** (guided Q&A) into reusable `skill.md`

> Viral-first premise: point IndexFox at a messy folder → get order, fast.

## What it does (v0)
- Scan selected folders (multiple paths)
- Extract lightweight text from common office formats (PPTX/XLSX/PDF/DOCX/MD/TXT)
- Produce:
  - `IDENTITY.md` (your work profile: primary role + secondary roles)
  - `skill_candidates/` (proposed skills)
  - A guided wizard to finalize a candidate into a real `skill.md` (≈10 min)

## Privacy / Data
- Local-first: outputs are written **only to your machine**.
- BYOK (bring your own key) for cloud LLM usage.
- Default sensitivity: `internal`.

## Quickstart
```bash
# (placeholder) install method TBD
indexfox scan --path ~/Downloads --path ~/Documents

# then choose a candidate and co-author a skill
indexfox skill init
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
