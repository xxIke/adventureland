# Contracts

Implementable interface specifications for each system and infrastructure component. Per [M1](../../.agent/rules/mandates.md), contracts must exist before implementation begins.

## Status

Contract files will be authored per-component as implementation work is sequenced via the [roadmap](../roadmap/_index.md). Each contract is authored using the `spec-plan` workflow before the component's implementation phase begins.

## Contract Structure

Each contract file follows this structure:

1. **System identity** — name, scheduling characteristics, role
2. **Dependencies** — what it receives from `ctx`, what it reads
3. **Public interface** — factory function signature, returned object methods with parameter and return types
4. **Behavior contracts** — invariants, preconditions, postconditions, error handling expectations
5. **Event contracts** — events emitted (name, payload shape), events consumed (name, expected payload)
6. **Strategy interface** — if the system uses strategies, the strategy object method signatures
7. **Requirements traceability** — which requirement IDs (R1, R2, ...) this contract satisfies

## Type Vocabulary

Common types referenced across contracts (defined here to avoid duplication):

- **Entity** — a game entity reference from `parent.entities` with at minimum `{ id, type, x, y }`
- **Position** — `{ x, y, map? }` coordinates, optionally map-qualified
- **CharacterRef** — `{ name, class, role }` from config roster
- **Objective** — `{ type, target, reason }` describing current bot goal
- **SupplyRequest** — `{ character, type, item, quantity }` for merchant coordination

These will be refined as contracts are authored.

## Contract Files

| File | System | Phase | Status |
|------|--------|-------|--------|
| `scheduler.md` | Scheduler | Phase 0 | Authored |
| `event-bus.md` | Event Bus | Phase 0 | Authored |
| `world-model.md` | WorldModel | Phase 1 | Authored |
| `configuration.md` | Configuration | Phase 1 | Authored |
| `logging.md` | Logging | Phase 1 | Authored |
| `combat.md` | Combat | Phase 2 | Planned |
| `potion-regen.md` | Potion/Regen | Phase 2 | Planned |
| `movement.md` | Movement | Phase 2 | Planned |
| `party.md` | Party | Phase 3 | Planned |
| `objective.md` | Objective | Phase 3 | Planned |
| `merchant.md` | Merchant | Phase 4 | Planned |
