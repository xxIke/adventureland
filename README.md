# AdventureLand Bot

A bot system for [AdventureLand](https://adventure.land), a code MMORPG where players write JavaScript to control their characters. Game docs: [adventure.land/docs](https://adventure.land/docs)

## Vision

Fully autonomous bot system that progresses through the game — leveling, gearing, selecting objectives, coordinating multiple characters — without human intervention. Designed with purposeful software engineering discipline: isolated components, appropriate design patterns, and a clear overall architecture.

## Project Structure

```
adventureland/
├── docs/           # Project-level documentation (requirements, decisions, design)
├── src/            # Bot source code
├── scripts/        # Tooling scripts (hooks, symlink maintenance)
└── .agent/         # Agent surface for AI coding agent collaboration
```

## Components

Nine identified components from prior architectural analysis:

| # | Component | Responsibility |
|---|-----------|---------------|
| 1 | Runtime & Shared State | Entry point, lifecycle, loop ownership, shared state |
| 2 | World Model & Entity Processing | Centralized entity tracking, categorization, queries |
| 3 | Objective Selection & State Control | Hierarchical FSM, mode management, objective routing |
| 4 | Party Coordination & Communication | CM + localStorage coordination, roster, directives |
| 5 | Movement & Navigation | Move management, pathfinding, rally, positioning |
| 6 | Combat, Class Logic, & Survival | Combat engine, class policies, targeting, sustain |
| 7 | Merchant, Inventory, & Item Improvement | Trade, upgrades, compounds, supply workflows |
| 8 | Progression Planning & World Interactions | Target selection, events, game data integration |
| 9 | Logging, Configuration, & Debuggability | Structured logging, config, status channels |

## Browser-Native Constraints

This bot runs in the Adventure.Land in-game code editor, not a separate runtime:

- No Node.js APIs — browser JavaScript only
- Code loaded via `load_code()` slots in the game editor
- Build tooling bundles source into output targeting these slots
- Game globals (`character`, `parent`, `G`) are the primary API surface

## Status

Foundation phase (Directive D1). Project structure and agentic worksurface established. No application code yet.

See `.agent/progress/foundation.json` for current workstream state.

## Agent Surface

Shared policy lives in `.agent/`; tool-specific directories (`.claude/`, `.codex/`) inherit via symlinks.

- **Mandates (M1–M10):** `.agent/rules/mandates.md` (auto-loaded)
- **Directives:** `.agent/context/directives.md`
- **Standards:** `.agent/standards/`
- **Symlink rebuild:** `bash scripts/symlink_to_agent.sh`

See `AGENTS.md` and `CLAUDE.md` for bootstrap details.
