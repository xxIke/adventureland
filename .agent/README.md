# .agent/ — Shared Agent Surface

Tool-agnostic and model-agnostic collaboration space for AdventureLand bot. This directory is the canonical source for shared engineering policy, standards, workflows, and agentic infrastructure.

## What Lives Here

| Directory | Purpose | Committed |
|-----------|---------|-----------|
| `context/` | Mandates, directives, project context | Yes |
| `standards/` | Engineering quality standards | Yes |
| `policies/` | Canonical sources, boundaries, governance | Yes |
| `rules/` | Path-scoped rules (symlinked into tool dirs) | Yes |
| `skills/` | Shared skills (symlinked into tool dirs) | Yes |
| `workflows/` | Multi-step procedures | Yes |
| `checklists/` | Definition of done, compliance gates | Yes |
| `progress/` | Live workstream state | Yes |
| `templates/` | Reusable templates | Yes |

## How to Use

1. **Bootstrap:** Mandates auto-load via `rules/mandates.md`, then read relevant progress workstreams
2. **Standards:** Read `standards/core.md` for universal quality expectations
3. **Task-specific:** Load relevant workflow, skill, or checklist for the task at hand

## Canonical Source Rule

Tool-specific directories (`.claude/`, `.codex/`) consume shared content via symlinks. Always edit the canonical file here, never the symlink target. Run `scripts/symlink_to_agent.sh` after adding or removing shared rules/skills.
