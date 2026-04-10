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
  - G.items
---

# Potion/Regen Contract

## Identity

The Potion/Regen system manages HP and MP recovery through deliberate potion tier selection and regen skills. It runs on its own adaptive cycle, independent of all combat-related systems. The primary goal is to **minimize potion consumption** — potions cost gold, and overconsumption is unsustainable. Regen is the preferred default whenever acceptable.

**Scheduling**: Registered as `'potion-regen'` with adaptive delay. Schedules next tick at recovery cooldown expiry for minimal wasted ticks. Applies to all character types including merchant.

## Dependencies

- `ctx.world` — reads `hostileMonsters`, `hostilePlayers` for combat context
- `ctx.logger` — logs recovery actions and errors
- Game globals: `character`, `parent.next_skill`, `use_skill()`, `swap()`, `G.items`

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
| **Not under pressure** (idle, traveling, no hostiles nearby) | Always use regen when missing ≥ regen amount. No urgency — regen recovers at zero gold cost. |
| **Under pressure** (being targeted or hostiles nearby) | Use potions when missing amount ≥ a potion's restoration value. Otherwise regen. |

### Potion Tier Selection

Potion restoration values are derived from `G.items[potionName].gives[0][1]` — not hardcoded. The selection algorithm picks the **largest potion whose restoration value ≤ missing amount**, maximizing recovery per cooldown without wasting value.

Example: missing 350 HP → skips hpotx (10000 > 350), skips hpot1 (400 > 350), selects hpot0 (200 ≤ 350).

If no potion's restoration value fits within the deficit, regen is used instead.

### Regen Effectiveness Gate

Regen only fires when the deficit ≥ the regen restoration amount (50 HP / 100 MP). This prevents wasting a 4-second cooldown on trivial recovery that would leave the character unresponsive to changing combat conditions.

### Decision Priority

Priority between HP and MP is determined by **missing percentage** (`missing / max`). The resource with a higher percentage missing gets priority. When tied, **MP wins** — MP is required for all actions including basic attacks.

### Per-Resource Action Resolution

For each resource (HP and MP independently):

| Condition | Action |
|-----------|--------|
| `missing < regenAmount` | Skip — deficit too small for any recovery |
| `missing ≥ regenAmount`, no potion fits | Regen — deficit is real but below smallest potion value |
| Potion fits, not under pressure | Regen — save gold, no urgency |
| Potion fits, under pressure | Use that potion — fast recovery needed |

## Potion Inventory Management

Since `use_skill('use_hp')` consumes the **last** HP potion in `character.items[]`, consuming the correct tier requires inventory management:

1. **Scan inventory**: Iterate `character.items[]` to find available potions by type and their slot indices.
2. **Select tier**: Based on missing amount, select the desired potion tier from the tables above.
3. **Ensure position**: If the desired tier is not the last potion of its type in inventory, swap it to be last using `await swap(from_slot, to_slot)` (swap is async — must await before use_skill).
4. **Consume**: Call `use_skill('use_hp')` or `use_skill('use_mp')`.
5. **Fallback**: If the desired tier is unavailable, fall back to the next **lower** tier (e.g., hpot1 → hpot0). If no potion of any tier is available, use `regen_hp`/`regen_mp`. Never fall back to a higher tier — economy is the priority.

## Tick Sequence

1. If `character.rip`, return `{ delay: 1000 }`.
2. If potion in-flight (async swap pending), return cooldown delay.
3. If recovery on cooldown (`Date.now() < parent.next_skill.use_hp`), return cooldown delay.
4. If HP is full and MP is full, return `{ delay: 250 }` (short idle check).
5. Calculate `missingHp`, `missingMp`.
6. Determine combat context from `character.targets` and `ctx.world` hostile presence.
7. Resolve action for each resource via `resolveAction(missing, regenAmount, potionList, underPressure)`.
8. If both resources need recovery, pick higher urgency (missing percentage). MP wins ties.
9. **Execute**: If potion action, run inventory management (scan, swap if needed), then `use_skill('use_hp'/'use_mp')`. If regen action, call `use_skill('regen_hp'/'regen_mp')`.
10. Return cooldown delay (schedule at next cooldown expiry).

## Context Dependencies

```yaml
writes: nothing

reads:
  ctx.world:
    - hostileMonsters   # combat context detection
    - hostilePlayers    # combat context detection
  game_globals:
    - G.items           # potion restoration values (lazy-init)
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
- Missing amount ≥ the selected potion's restoration value (`G.items[potion].gives[0][1]`)

### Preconditions for Regen Use

- `character.rip` is false
- Recovery cooldown is clear
- Missing amount ≥ regen restoration amount (50 HP / 100 MP)

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
| R48 (centralized thresholds) | Potion thresholds derived from G.items — no hardcoded magic numbers |

## Future Extensions

**Party healer availability**: Growth point exists in `resolveAction()` for checking whether a party healer can cover the deficit. When implemented, the system would skip self-recovery for HP when a healer is available, preserving the shared cooldown for MP recovery or emergency situations.

**Elixirs and consumable buffs**: End-state extension for managing persistent consumable buffs (elixirs) that provide stat boosts. Some may be always-on for certain characters, others situational. May compete for the same cooldown/scheduling as potions — needs verification. This would extend the recovery system's scope to include buff maintenance alongside HP/MP recovery.
