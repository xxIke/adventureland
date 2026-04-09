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

## Process

1. Review each file, confirm/correct MVP and end-state intent
2. Identify gaps in requirements (R1-R50) — add new requirements where needed
3. Update architecture and contracts to support confirmed intent
4. Implement against updated contracts
