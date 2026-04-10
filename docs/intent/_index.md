# Intent Capture Index

Mechanic-level intent definitions for MVP and end-state. Each file covers a category of game mechanics with concrete desired behavior at two milestones:

- **MVP**: Minimum viable bot — 3 hunters + 1 merchant operating unattended
- **End-state**: Post-MVP iteration target — full feature set

## Files

| File | Category | Mechanics | Status |
|------|----------|-----------|--------|
| [combat.md](combat.md) | Combat, class skills, conditions | 18 | Draft |
| [recovery.md](recovery.md) | Death, respawn, state persistence | 5 | Draft |
| [movement.md](movement.md) | Navigation, locations, map transitions | 10 | Draft |
| [sustain.md](sustain.md) | Potions, regen, HP/MP management, elixirs | 8 | Draft |
| [party.md](party.md) | Formation, communication, coordination | 9 | Draft |
| [objective.md](objective.md) | Strategy, hunts, events, target selection | 10 | Draft |
| [merchant.md](merchant.md) | Economy, banking, trading, resupply | 18 | Draft |
| [gear-progression.md](gear-progression.md) | Improvement, acquisition, comparison, goals | 10 | Draft |
| [world.md](world.md) | Entity classification, game data, gathering, crafting | 20 | Draft |

## Reference Implementations

Prior implementations provide working examples of many mechanics documented here:

- **Previous bot (hyper-fixate)**: `../hyper-fixate/codes/` — utility functions, merchant logic, combat patterns, entity monitoring
- **Previous bot (v2/archive)**: `archive/` directory and `codex` branch — earlier bot implementations
- **Server reference (game API)**: `../IkeBot/reference/adventureland_mongodb/js/runner_functions.js`
- **Server reference (skills/design)**: `../IkeBot/reference/adventureland_mongodb/design/`
- **Server reference (server logic)**: `../IkeBot/reference/adventureland_mongodb/node/server.js`
- **Server reference (engine)**: `../IkeBot/reference/common_engine/`
- **Server reference (config)**: `../IkeBot/reference/adventureland_secretsandconfig/`

**Do NOT reference ALClient or caracAL** — these are third-party open-source clients, not official game resources.

## Process

1. Review each file, confirm/correct MVP and end-state intent
2. Identify gaps in requirements (R1-R60) — add new requirements where needed
3. Update architecture and contracts to support confirmed intent
4. Implement against updated contracts
