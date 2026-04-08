# Implementation Roadmap

Phased plan for building the AdventureLand bot system from skeleton to Minimum Viable Bot (MVB).

## MVB Definition

A functioning bot system where:
- 1 merchant + 3 hunters are loaded and operating
- Combat bots move and hunt together as a coordinated party
- Combat bots are taskable to hunt specific target packs
- Merchant gathers junk/overflow from combat bots and restocks potions
- Farm target is configurable via localStorage without code changes

## Phase Dependency Chain

```
Phase 0: Skeleton
    |
Phase 1: See the World
    |
Phase 2: Fight
    |
Phase 3: Hunt Together
    |
Phase 4: Merchant Support  ->  MVB Complete
```

Each phase builds on the previous. Contracts for each phase's systems are authored before implementation begins (M1).

## Current Phase

Phase 0 — not yet started. Contracts for scheduler and event bus are the first implementation prerequisite.

## Phases

| Phase | Focus | Acceptance | Details |
|-------|-------|-----------|---------|
| [Phase 0](phase-0-skeleton.md) | Skeleton | Architecture runs, code deploys | Build pipeline, ctx, scheduler, bus, stubs |
| [Phase 1](phase-1-world.md) | See the World | Bot observes game state | WorldModel, config, logging |
| [Phase 2](phase-2-combat.md) | Fight | Single character farms | Combat, potions, movement |
| [Phase 3](phase-3-party.md) | Hunt Together | Party hunts as a group | Party, objectives, coordinated movement |
| [Phase 4](phase-4-merchant.md) | Merchant Support | MVB complete | Merchant workflows, field resupply |

## Post-MVB Iteration

After MVB, each improvement is a system or strategy change — no architectural rework needed:
- Class-specific combat strategies (priest, mage, ranger)
- Custom movement/pathfinding (replace smart_move internals)
- Upgrade/compound workflows
- Progression planning and dynamic target selection
- Event participation
- Trade and economy features
