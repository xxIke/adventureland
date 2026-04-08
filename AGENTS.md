# AGENTS.md

Cross-agent bootstrap for AdventureLand bot — a browser-native bot system for [AdventureLand](https://adventure.land), a code MMORPG where players write JavaScript to control their characters. Nine identified components covering runtime, world model, objectives, party coordination, movement, combat, merchant, progression, and logging. Game docs: [adventure.land/docs](https://adventure.land/docs)

This file and `CLAUDE.md` must stay aligned — update both when shared bootstrap expectations change.

## Bootstrap Read Order

For non-trivial work, agents read in this order:

1. Relevant `.agent/progress/*.json` — live workstream state
2. `.agent/context/directives.md` — phase-scoped guidance
4. `.agent/standards/core.md` — universal engineering standards
5. Relevant workflow from `.agent/workflows/` if the task matches one

Only load what the task requires. Do not front-load the entire surface.

## Canonical Sources

| Domain | Location |
|--------|----------|
| Mandates (enduring) | `.agent/rules/mandates.md` (auto-loaded) |
| Live progress | `.agent/progress/` |
| Directives (phase-scoped) | `.agent/context/directives.md` |
| Engineering standards | `.agent/standards/` |
| Policies and boundaries | `.agent/policies/` |
| Shared rules | `.agent/rules/` |
| Shared skills | `.agent/skills/` |
| Workflows | `.agent/workflows/` |
| Quality checklists | `.agent/checklists/` |

## Boundary Rules

1. Shared policy lives in `.agent/` — tool-specific directories inherit, not duplicate.
2. Tool-specific extensions (`.claude/CLAUDE.md`, `.codex/AGENTS.md`) add routing, not policy.
3. Edit canonical source in `.agent/`, not symlinks in tool directories.
4. Every surface change must propagate to all affected tool surfaces (M8).

## Tool-Specific Routing

| Tool | Config | Rules | Skills | Agents |
|------|--------|-------|--------|--------|
| Claude Code | `.claude/settings.json` | `.claude/rules/` (symlinks) | `.claude/skills/` (symlinks) | `.claude/agents/` |
| Codex | `.codex/config.toml` | `.codex/rules/` (`*.rules` for exec policy plus symlinked shared rules) | `.codex/skills/` (symlinks) | — |

Run `scripts/symlink_to_agent.sh` after adding new shared rules or skills to `.agent/`.
