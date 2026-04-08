# Canonical Sources

Source-of-truth precedence rules for this repository.

## Precedence Order

When sources conflict, higher-numbered sources override lower-numbered ones for their domain:

1. **Root adapters** (`AGENTS.md`, `CLAUDE.md`) — shared control-plane intent and boundaries
2. **Shared agent surface** (`.agent/`) — standards, workflows, checklists, mandates
3. **Component documentation** (`docs/`) — requirements, architecture, design, contracts
4. **Component implementation** (`src/`) — code, tests

## Domain Ownership

| Domain | Canonical Source |
|--------|-----------------|
| Mandates and constraints | `.agent/rules/mandates.md` |
| Active directives | `.agent/context/directives.md` |
| Engineering standards | `.agent/standards/` |
| Workflows | `.agent/workflows/` |
| Quality checklists | `.agent/checklists/` |
| Shared rules | `.agent/rules/` |
| Shared skills | `.agent/skills/` |
| Policies and boundaries | `.agent/policies/` |
| Context loading guidance | `.agent/policies/context_loading.md` |

Extend this table as project components are established.

## Component Documentation Precedence

Component-local documentation is canonical for that component's requirements, design, architecture, and contracts. Planning artifacts that preceded the documentation are historical input, not canonical source.

## Rules

1. Do NOT duplicate canonical content into adapter files — reference paths instead
2. Tool-specific adapters (`.claude/`, `.codex/`) inherit from `.agent/` — they do not define independent policy
3. Planning artifacts and session transcripts are historical input — they inform documentation but are not canonical once component docs exist
4. When component documentation exists, it supersedes any planning artifact covering the same scope
