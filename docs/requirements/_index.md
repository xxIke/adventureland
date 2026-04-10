# Requirements

Architecture-independent requirements for a browser-native Adventure Land bot system. These capture intent — what the bot must do and why it matters — without prescribing how. They survive re-architecture and can be re-examined against any implementation approach.

## Scope

**In scope:** Browser-native automation running in Adventure Land's CODE environment. Party coordination (1 merchant + 3 hunters), merchant support workflows, progression-aware farming, maintainable subsystem boundaries, observability for iterative development.

**Out of scope:** Custom protocol clients, external process orchestration, containerized services, host-machine dependencies.

## Requirement Structure

Each requirement uses this format:

- **ID**: Sequential (R1, R2, ...) within its file
- **Description**: What the bot must do
- **Why**: Why this matters — the problem or lesson that motivates it
- **Baseline**: Minimum acceptable behavior that satisfies the requirement
- **Priority**: `must` (needed for practical implementation), `should` (strong near-term), `later` (useful but not foundational)

## Files

| File | Coverage | Requirements |
|------|----------|-------------|
| [core.md](core.md) | Bootstrapping, lifecycle, recovery, state awareness, party, movement, combat, objectives, logging, configuration, party travel, follow | R1–R20, R51, R60 |
| [merchant-and-progression.md](merchant-and-progression.md) | Inventory, supply, item improvement, economy, objective selection, stand management, NPC selling, gold management, trade-slot resupply, gear delivery, gear goals, banking | R21–R32, R52–R58 |
| [world-and-game-systems.md](world-and-game-systems.md) | Map/travel, monster assessment, hunts/events, skills/conditions, tracker/buffs | R33–R41, R59 |
| [nonfunctional.md](nonfunctional.md) | Maintainability, observability, recoverability, configurability, testability, browser constraints | R42–R50 |

## Priority Summary

- **must**: 42 requirements — needed for a functioning bot
- **should**: 13 requirements — strong near-term capabilities
- **later**: 5 requirements — valuable but not foundational
