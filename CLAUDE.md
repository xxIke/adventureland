# CLAUDE.md

Root Claude Code bootstrap for AdventureLand bot — a browser-native bot system for [AdventureLand](https://adventure.land), a code MMORPG where players write JavaScript to control their characters. Nine identified components covering runtime, world model, objectives, party coordination, movement, combat, merchant, progression, and logging. Game docs: [adventure.land/docs](https://adventure.land/docs)

This file and `AGENTS.md` must stay aligned — update both when shared bootstrap expectations change.

## Bootstrap Read Order

For non-trivial work, read in this order (only load what the task requires):

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

1. Shared policy lives in `.agent/` — `.claude/` inherits via symlinks.
2. Edit canonical source in `.agent/`, not symlinks.
3. Every change propagates to all affected surfaces (M8).

## Claude-Specific Routing

- Settings and permissions: `.claude/settings.json`
- Path-scoped rules: `.claude/rules/` (symlinked from `.agent/rules/`)
- Sub-agents: `.claude/agents/`
- Skills: `.claude/skills/` (symlinked from `.agent/skills/`)

All Claude-specific files extend the shared bootstrap — they do not replace it.

Run `scripts/symlink_to_agent.sh` after adding new shared rules or skills to `.agent/`.
