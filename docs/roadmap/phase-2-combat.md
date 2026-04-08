# Phase 2: Fight

Implement combat, potion/regen, and movement systems. A single character can farm a zone and survive.

## Scope

### Combat System
- Target selection from WorldModel entity lists (priority: hostiles > objective targets > cleanup)
- Basic melee combat strategy (attack nearest, use basic skills)
- Strategy interface established — melee strategy is the first implementation, others follow post-MVB
- Coordinate with movement for repositioning requests

### Potion/Regen System
- Evaluate HP and MP state on dedicated high-frequency cycle
- Select appropriate potion type based on inventory and thresholds
- Use regen when potions aren't needed
- Configurable thresholds from `ctx.config`

### Movement System
- Travel mode: wrap `smart_move()` for long-distance travel to map locations
- Combat repositioning: maintain distance from target, basic kiting
- Strategy interface established — smart_move wrapper is the first implementation, custom pathfinding follows post-MVB
- Handle movement interruption and recovery

## Prerequisites

- Phase 1 complete (WorldModel providing entity data)
- Contracts authored: `contracts/combat.md`, `contracts/potion-regen.md`, `contracts/movement.md`

## Acceptance Criteria

1. Character automatically targets and attacks nearby monsters
2. Character uses potions when HP/MP drops below configured thresholds
3. Character travels to a configured farm location using movement system
4. Character survives sustained farming (doesn't die to preventable causes)
5. Combat strategy is swappable — melee strategy can be replaced without modifying combat system
6. Movement handles both travel-to-location and maintain-distance behaviors

## Requirements Addressed

R9 (movement abstraction), R10 (travel vs repositioning), R11 (priority targeting), R12 (class-aware combat), R13 (HP/MP management), R40 (class skills)
