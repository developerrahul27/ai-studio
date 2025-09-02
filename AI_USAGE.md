# AI Usage Notes

Short, high-level notes on where AI assisted during this project (kept intentionally concise).

- Tools used
  - ChatGPT (code generation and refactors), GitHub Copilot (inline suggestions), Cursor (AI pair‑programming and quick refactors), v0 (scaffolding and UI previews).
- How AI was applied
  - Scaffolding React/Next + Tailwind components and page shells.
  - Drafting accessible UI patterns (labels, aria-live, focus-visible).
  - Converting feedback into targeted code edits (upload preview in input, chat UI, Stop behavior).
  - Writing concise mock API handlers and simplifying client-side logic (AbortController, single-attempt fetch).
  - Cursor-assisted quick refactors and small, targeted code actions.
- Quality and safety checks
  - All AI output was manually reviewed, type errors resolved locally, and logic verified in the preview.
  - No secrets were shared with AI; environment variables and integration keys remain local to the project.
- Limits and responsibility
  - AI suggestions can be incomplete or outdated; final code and architecture decisions were validated by hand.
- PR and automation
  - AI-drafted PR descriptions/changelogs (always manually reviewed before merge).
- Repro/maintenance tips
  - Keep prompts explicit (file paths, exact behaviors).
  - Prefer small edits; test in preview after each change.
  - Retain type-safety: add explicit types for events and state, avoid any.