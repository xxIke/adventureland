---
system: PotionRegen
writes: nothing
reads:
  ctx.world:
    - hostileMonsters
    - hostilePlayers
game_globals:
  - character
  - parent.next_skill
  - use_skill()
  - swap()
---

# Potion/Regen Contract

## Identity

The Potion/Regen system manages HP and MP recovery through deliberate potion tier selection and regen skills. It runs on its own adaptive cycle, independent of all combat-related systems. The primary goal is to **minimize potion consumption** — potions cost gold, and overconsumption is unsustainable. Regen is the preferred default whenever acceptable.

**Scheduling**: Registered as `'potion-regen'` with adaptive delay. Schedules next tick at recovery cooldown expiry for minimal wasted ticks. Applies to all character types including merchant.

## Dependencies

- `ctx.world` — reads `hostileMonsters`, `hostilePlayers` for combat context
- `ctx.logger` — logs recovery actions and errors
- Game globals: `character`, `parent.next_skill`, `use_skill()`, `swap()`

**Does NOT read** `ctx.targeting` or any combat system reference. Combat context is determined from game state signals directly (`character.targets`, `ctx.world` hostile lists). This ensures the system works for all character types including merchant.

## Game API Recovery Skills

See [game-api.md](../game-api.md) — Recovery Group.

- `use_skill('use_hp')`: Consumes the **last** HP potion in `character.items[]`. If no HP potions exist, performs a small HP regen (same 2x cooldown as `regen_hp`).
- `use_skill('use_mp')`: Same behavior for MP potions.
- `use_skill('regen_hp')`: Regenerates 50 HP without potions. Cooldown: **2x** the potion cooldown.
- `use_skill('regen_mp')`: Regenerates 100 MP without potions. Cooldown: **2x** the potion cooldown.
- All four skills share a single cooldown checked via `parent.next_skill.use_hp`.
- This cooldown group is **independent** from the attack/heal cooldown group.

## Public Interface

### `createPotionRegen(ctx)`

Creates and returns a Potion/Regen system instance.

**Parameters:**
- `ctx` (object) — shared context

**Returns:** Object with:
- `tick()` — evaluation function registered with scheduler

### `potionRegen.tick()`

Main evaluation tick.

**Returns:** `{ delay }` for adaptive scheduling.

## Combat Context Detection

The system determines whether the character is under combat pressure using game state signals directly — NOT by reading any combat or targeting system:

| Signal | Meaning |
|--------|---------|
| `character.targets > 0` | Character is being targeted by one or more entities. Most reliable indicator that recovery urgency is high. |
| `ctx.world.hostileMonsters.length > 0` | Hostile monsters are nearby targeting party members. Moderate urgency. |
| `ctx.world.hostilePlayers.length > 0` | Hostile players are nearby. High urgency. |

**Combat context is true** when `character.targets > 0` OR hostile entities exist in `ctx.world`.

This approach:
- Works for all character types (merchant has no combat system but can be attacked)
- Is never stale between combat ticks
- Cannot be wrong due to target transitions in other systems

## Recovery Decision Model

### Context-Dependent, Regen-First

| Context | Recovery Strategy |
|---------|-------------------|
| **Not under pressure** (idle, traveling, no hostiles nearby) | Always use regen, even if missing a large chunk. No urgency — regen recovers over time at zero gold cost. |
| **Under pressure** (being targeted or hostiles nearby) | Use potions when missing significant HP/MP. Potion tier selected by missing amount for economy. |

### Potion Tier Selection

When under pressure and the missing amount warrants a potion:

| Missing HP | Potion Tier |
|------------|------------|
| > 10000 | `hpotx` |
| > 800 | `hpot1` |
| > 400 | `hpot0` |
| <= 400 | `regen_hp` (small amounts don't justify gold even under pressure) |

| Missing MP | Potion Tier |
|------------|------------|
| > 10000 | `mpotx` |
| > 1000 | `mpot1` |
| > 500 | `mpot0` |
| <= 500 | `regen_mp` |

These thresholds are aligned with the v2 implementation.

### Decision Priority

HP always takes priority over MP at the same urgency tier (survival-critical). Within a resource type, potions take priority over regen when warranted by context and missing amount.

## Potion Inventory Management

Since `use_skill('use_hp')` consumes the **last** HP potion in `character.items[]`, consuming the correct tier requires inventory management:

1. **Scan inventory**: Iterate `character.items[]` to find available potions by type and their slot indices.
2. **Select tier**: Based on missing amount, select the desired potion tier from the tables above.
3. **Ensure position**: If the desired tier is not the last potion of its type in inventory, swap it to be last using `await swap(from_slot, to_slot)` (swap is async — must await before use_skill).
4. **Consume**: Call `use_skill('use_hp')` or `use_skill('use_mp')`.
5. **Fallback**: If the desired tier is unavailable, fall back to the next **lower** tier (e.g., hpot1 → hpot0). If no potion of any tier is available, use `regen_hp`/`regen_mp`. Never fall back to a higher tier — economy is the priority.

## Tick Sequence

1. If `character.rip`, return `{ delay: 1000 }`.
2. If recovery on cooldown (`Date.now() < parent.next_skill.use_hp`), return `{ delay: parent.next_skill.use_hp - Date.now() + 10 }` (schedule at cooldown expiry).
3. If HP is full and MP is full, return `{ delay: 250 }` (short idle check).
4. Determine combat context from `character.targets` and `ctx.world` hostile presence.
5. Calculate `missingHp = character.max_hp - character.hp`.
6. Calculate `missingMp = character.max_mp - character.mp`.
7. **If not under pressure**: Use `regen_hp` if HP not full, else `regen_mp` if MP not full. HP first.
8. **If under pressure**: Select potion tier from tables above based on missing amount. HP wins if both need recovery (survival-critical).
9. **Execute**: If potion action, run inventory management (scan, swap if needed), then `use_skill('use_hp'/'use_mp')`. If regen action, call `use_skill('regen_hp'/'regen_mp')`.
10. Return `{ delay: parent.next_skill.use_hp - Date.now() + 10 }` (schedule at next cooldown expiry).

## Context Dependencies

```yaml
writes: nothing

reads:
  ctx.world:
    - hostileMonsters   # combat context detection
    - hostilePlayers    # combat context detection
```

## Behavior Contracts

### Invariants

1. Potion/Regen never writes to `ctx.world` or `ctx.targeting`.
2. Potion/Regen never reads from any combat, targeting, or attack system.
3. Potion/Regen never attacks, heals, moves, or makes combat decisions.
4. At most one `use_skill` call per tick (all recovery skills share a cooldown).
5. **Regen is the preferred default** — potions are only used when under combat pressure and the missing amount justifies gold cost.

### Preconditions for Potion Use

- `character.rip` is false
- Recovery cooldown is clear (`Date.now() >= parent.next_skill.use_hp`)
- Character is under combat pressure (`character.targets > 0` or hostiles in world)
- Missing HP or MP exceeds the minimum potion threshold (400 HP / 500 MP)

### Preconditions for Regen Use

- `character.rip` is false
- Recovery cooldown is clear
- HP or MP is not at maximum

### Error Handling

1. If `use_skill()` throws or rejects, log the error and continue. Do not re-throw.
2. If `swap()` throws (inventory management), log and fall back to using whatever potion `use_hp` would naturally consume.
3. If `ctx.world` is not yet populated (boot ordering), treat as not-under-pressure (use regen).
4. The tick never throws to the scheduler.

## Event Contracts

### Events Emitted

None. Potion/Regen is a self-contained system.

### Events Consumed

None. Reads game globals and `ctx.world` directly.

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R13 (HP/MP recovery management) | Dedicated adaptive cycle with deliberate potion/regen selection |
| R42 (explicit responsibilities) | System does one thing: manage recovery consumables. No combat, no targeting, no movement. |
| R44 (no silent failures) | All errors caught and logged |
| R48 (centralized thresholds) | Potion thresholds defined in contract; could be moved to config if tuning needed |

## Future Extensions

**Elixirs and consumable buffs**: End-state extension for managing persistent consumable buffs (elixirs) that provide stat boosts. Some may be always-on for certain characters, others situational. May compete for the same cooldown/scheduling as potions — needs verification. This would extend the recovery system's scope to include buff maintenance alongside HP/MP recovery.
