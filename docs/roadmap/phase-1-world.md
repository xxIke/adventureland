# Phase 1: See the World

Implement the WorldModel, configuration, and logging systems. The bot can observe and report on game state correctly.

## Scope

### WorldModel System
- Poll game globals (`character`, `parent.entities`, `G`) on repeating cycle
- Categorize entities into structured collections: party members, hostile monsters, hostile players, objective targets, special monsters, nearby NPCs
- Expose query helpers (nearest hostile, injured party member, etc.)
- Maintain separation between raw observations and derived state (R6)

### Configuration
- Load roster from config (character names, classes, roles)
- Load thresholds (HP/MP percentages, distances, timing parameters)
- Support farm target override from localStorage

### Logging System
- Structured log collection (state changes, errors, system events)
- Console output with system and severity context
- Periodic snapshot to localStorage for post-mortem debugging
- Current status inspectable (what the bot sees, current state)

## Prerequisites

- Phase 0 complete (skeleton running in-game)
- Contracts authored: `contracts/world-model.md`, `contracts/logging.md`

## Acceptance Criteria

1. WorldModel populates `ctx.world` with categorized entities from live game state
2. Entity lists refresh on the WorldModel's polling cycle
3. Query helpers return correct results (nearest hostile, party member list)
4. Logging system records WorldModel updates and can be inspected in console
5. Status snapshot written to localStorage on schedule
6. Configuration loads roster and thresholds; farm target readable from localStorage

## Requirements Addressed

R5 (structured world view), R6 (raw vs derived separation), R17 (structured logging), R18 (inspectable status), R19 (centralized config), R44 (no silent failures), R45 (decision context), R46 (localStorage schema), R48 (centralized thresholds)
