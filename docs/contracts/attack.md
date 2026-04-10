---
system: Attack
writes: nothing
reads:
  ctx.targeting:
    - attackTarget
    - healTarget
game_globals:
  - character
  - attack()
  - heal()
  - can_attack()
  - loot()
  - get_chests()
  - change_target()
---

# Attack Contract

## Identity

The Attack system executes `attack()` or `heal()` against the Targeting system's current target. It is a thin, cooldown-gated executor — it does not select targets, use potions, or manage skills. It reads what to act on from `ctx.targeting` and calls the appropriate game API function.

**Scheduling**: Registered as `'attack'` with adaptive delay. When on cooldown, schedules next tick at cooldown expiry. When idle (no target), uses a longer polling interval. Not applicable to merchant characters.

## Dependencies

- `ctx.targeting` — reads `attackTarget`, `healTarget`
- `ctx.logger` — logs attack/heal actions and errors
- Game globals: `character`, `attack()`, `heal()`, `can_attack()`, `loot()`, `get_chests()`, `change_target()`

**Does NOT read** `ctx.world` or `ctx.config`. The Attack system's only decision is whether the game API allows the action right now.

## Public Interface

### `createAttack(ctx)`

Creates and returns an Attack system instance.

**Parameters:**
- `ctx` (object) — shared context (must have `ctx.targeting` available)

**Returns:** Object with:
- `tick()` — execution function registered with scheduler

### `attack.tick()`

Main execution tick:

1. **Death check**: If `character.rip`, return `{ delay: 1000 }`.
2. **Loot**: If `Object.keys(get_chests()).length > 0`, call `loot()`.
3. **Read targets**: Read `attackTarget` and `healTarget` from `ctx.targeting`.
4. **No target**: If both are `null`, return `{ delay: 500 }` (idle polling).
5. **Determine action**:
   - If `healTarget` is not null: action is `heal(healTarget)`.
   - Else: action is `attack(attackTarget)`.
6. **Gate check**: If action is attack, check `can_attack(target)`. If false, return `{ delay: 100 }` (short retry — target may come into range soon).
7. **Execute**: Call `attack(target)` or `heal(target)`. Fire-and-forget with `.catch()` for error logging. Update game UI target via `change_target(target)`.
8. **Adaptive delay**: Return `{ delay: Math.max(50, Math.floor(1000 / character.frequency)) }`.

**Returns:** `{ delay }` for adaptive scheduling.

### Cooldown-Gated Scheduling

The attack/heal cooldown is `1000 / character.frequency` milliseconds. The system uses adaptive delay to avoid ticking when the action cannot fire:

| State | Delay |
|-------|-------|
| Just attacked/healed | `1000 / character.frequency` (full cooldown) |
| Target exists, `can_attack()` false | 100ms (short retry for range/cooldown) |
| No target | 500ms (idle polling) |
| Character dead | 1000ms |

## Context Dependencies

```yaml
writes: nothing

reads:
  ctx.targeting:
    - attackTarget
    - healTarget
```

## Behavior Contracts

### Invariants

1. Attack never writes to `ctx.world` or `ctx.targeting`.
2. Attack never calls `move()`, `smart_move()`, or `use_skill()`.
3. Attack never selects targets — it reads whatever Targeting has decided.
4. At most one `attack()` or `heal()` call per tick (they share a cooldown).
5. `attack()` and `heal()` are called as distinct game API functions, never hidden behind a polymorphic interface.
6. The tick function never throws to the scheduler — all errors are caught and logged.

### Preconditions for Attack

- `character.rip` is false
- `ctx.targeting.attackTarget` is not null
- `can_attack(target)` returns true

### Preconditions for Heal

- `character.rip` is false
- `ctx.targeting.healTarget` is not null
- `character.heal > 0` (character has heal capability)
- Target is in range (heal range same as attack range per `character.range`)

### Error Handling

1. If `attack()` or `heal()` rejects, log the error with target context and continue. Do not re-throw.
2. If `loot()` throws, catch and continue.
3. If `ctx.targeting` is not yet available (boot ordering), treat as no target (idle delay).
4. The tick never throws to the scheduler.

## Event Contracts

### Events Emitted

None. Attack is a pure executor.

### Events Consumed

None. Attack reads `ctx.targeting` directly.

## Character Applicability

Attack is only registered for hunter characters. Merchant characters do not register an Attack system — they have no combat capability and no attack/heal cooldown to manage.

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R12 (class-aware combat) | Heal vs attack decision based on targeting system's heal/attack target split |
| R42 (explicit responsibilities) | Attack executes. Does not select targets, reposition, use potions, or use skills. |
| R44 (no silent failures) | All errors caught and logged with target context |
