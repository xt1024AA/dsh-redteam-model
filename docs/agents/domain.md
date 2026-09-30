# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout for this repo: multi-context

Confirmed with the user at setup time: this repo is **multi-context** — one `CONTEXT.md` per subproject, plus a `CONTEXT-MAP.md` at the repo root that points at them.

Decisions that span contexts live in the root `docs/adr/`. Decisions scoped to a single context live in that context's own `docs/adr/`.

`CONTEXT-MAP.md` and the per-subproject `CONTEXT.md` files **do not exist yet**. They are created lazily by `/domain-modeling`, at the moment the first real glossary entry or decision is written — not upfront. Until then, proceed silently.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root, once it exists: it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** at the repo root: system-wide decisions.
- **`<context>/docs/adr/`**: context-scoped decisions for the context you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Contexts in this repo

| Context | What it owns |
| ------- | ------------ |
| `modes/` | The ten work-mode presets. Each mode is self-contained: `persona` / `playbook` / `skills` / `refs`. |
| `plugins/` | The runtime plugins, one package per plugin (`dsh-stage-gate`, `dsh-route-boost`, …). |
| `src/` | The Redteam Manager plugin (host + client TypeScript). `lib/` is its build output, not a context. |
| `shared/` | Skills, refs and scripts shared across modes and plugins. |

## File structure

Multi-context repo (this repo):

```
/
├── CONTEXT-MAP.md              ← created lazily; points at each context's CONTEXT.md
├── docs/adr/                   → system-wide decisions
├── modes/                      context: the ten work modes
│   ├── CONTEXT.md
│   └── docs/adr/               → mode-level decisions
├── plugins/                    context: the runtime plugins, one package each
│   ├── dsh-stage-gate/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/
│   └── …
├── src/                        context: the Redteam Manager plugin
│   ├── CONTEXT.md
│   └── docs/adr/
└── shared/                     context: shared skills, refs and scripts
    ├── CONTEXT.md
    └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
