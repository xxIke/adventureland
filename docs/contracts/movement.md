# Movement Contract

## Identity

The Movement system handles all character movement — long-distance travel, combat repositioning, kiting, and fleeing. It provides a consistent interface (R9) over the game's movement APIs and maintains distinct modes for different movement needs (R10).

**Scheduling**: Registered as `'movement'` at ~250ms interval. Adaptive — returns shorter delays when actively repositioning or fleeing, longer delays when traveling or idle.

## Dependencies

- `ctx.objective` — reads objective type and location to determine mode (travel vs combat vs idle)
- `ctx.targeting` — reads `attackTarget`, `healTarget` for repositioning relative to current target
- `ctx.world` — reads `hostileMonsters`, `hostilePlayers` for flee direction
- `ctx.party` — reads `tank` to determine if this character is the tank (affects kite decision)
- `ctx.config` — reads `thresholds.fleeHpPercent`
- `ctx.logger` — logs movement decisions, travel state, errors
- Game globals: `character`, `smart_move()`, `move()`, `stop()`, `distance()`

## Public Interface

### `createMovement(ctx, strategy)`

Creates and returns a Movement system instance.

**Parameters:**
- `ctx` (object) — shared context (must have `ctx.targeting` available)
- `strategy` (object) — movement strategy implementing the strategy interface

**Returns:** Object with:
- `tick()` — main movement loop, registered with scheduler
- `stop()` — cancel current movement
- `getState()` — returns current movement state for diagnostics

### `movement.tick()`

Main movement tick. Behavior depends on current mode:

**Flee mode** (activated when `character.targets > 0` and `character.hp / character.max_hp < ctx.config.thresholds.fleeHpPercent`):
- Call `strategy.flee()` with nearby hostile entities from `ctx.world.hostileMonsters` and `ctx.world.hostilePlayers`.
- Auto-exit: if `character.hp / character.max_hp > ctx.config.thresholds.fleeHpPercent * 1.5`, exit flee mode.
- Return `{ delay: 100 }`.

**Combat mode** (activated when `ctx.targeting.attackTarget` or `ctx.targeting.healTarget` is not null):
- Read target from `ctx.targeting`. Effective range for the target is `character.range`.
- **Approach**: If distance to target > `character.range`, call `strategy.approach(target)`. Approach stops at `character.range` distance — never moves to target's exact position.
- **Hold ground** (melee pattern): Once within `character.range`, no further movement toward target. Melee characters approach and hold.
- **Maintain distance** (ranged/heal pattern): Stay within `character.range` of target. If pushed closer (by target movement or other repositioning), re-establish distance.
- **Kite check** (reactive, non-tank only): If `character.targets > 0` (being targeted by a hostile) and this character is not the party tank (see Party contract — tank identification):
  - Identify the hostile entity targeting this character.
  - If hostile IS the current target: maintain distance > `hostile.range` but < `character.range`. Call `strategy.kite(target, character.range, hostile.range)`.
  - If hostile is NOT the current target: stay outside `hostile.range` while staying within `character.range` of actual target. Call `strategy.kite(target, character.range, hostile.range)`.
  - Kiting is layered on top of normal positioning — it adds a constraint (avoid hostile's range) to the existing goal (stay within own range of target).
- Auto-exit: if targeting clears (both targets null) for 2 consecutive ticks, exit combat mode.
- Return `{ delay: 200 }`.

**Travel mode** (activated when `ctx.objective.location` is set and character is not at that location):
- Read destination from `ctx.objective.location.coord` (a `{ x, y, map }` position object).
- If not currently moving, call `strategy.travel(destination)`.
- If travel promise resolves, log arrival. Objective will detect arrival and update on its next tick.
- If travel promise rejects, increment retry counter. Retry up to 3 times with 2s backoff.
- After 3 failures, log error and enter idle mode.
- Return `{ delay: 1000 }`.

**Idle mode** (default):
- No active movement need.
- Return `{ delay: 500 }`.

**Returns:** `{ delay }` for adaptive scheduling.

### Mode Priority

Modes have a strict priority: `flee` > `combat` > `travel` > `idle`.

- Flee activates when HP is critically low and character is being targeted. Flee is **inviolable** — no other mode can override it.
- Combat repositioning activates when the targeting system has a target. Overrides travel.
- Travel resumes when higher-priority modes expire.
- Movement evaluates mode priority each tick based on current state — it does not rely on external events to set modes.

### `movement.stop()`

Cancel all current movement.

**Returns:** void

- Game API `stop()` is called to halt character movement.
- Mode is set to `'idle'`.
- Any pending travel promise is abandoned (not awaited further).
- Travel retry state is cleared.

**Note**: Travel is no longer initiated via a public `travel()` method. Movement reads `ctx.objective` each tick to determine if travel is needed. When the objective changes to one that requires a different location, movement automatically enters travel mode. When objective location is reached, objective updates on its next tick.

### `movement.getState()`

**Returns:** `{ mode: string, destination: any, strategyName: string }`
- `mode` is one of: `'idle'`, `'travel'`, `'combat'`, `'flee'`

## Movement Strategy Interface

A movement strategy is a plain object with these methods (D3, R9):

```
{
  name: string,
  travel(destination) -> Promise,
  approach(target) -> void,
  kite(target, characterRange, hostileRange) -> void,
  flee(hostiles) -> void,
}
```

- `name` — string identifier for logging (e.g., `'smart-move'`, `'custom-path'`)
- `travel(destination)` — execute long-distance travel. Returns a promise that resolves on arrival or rejects on failure.
- `approach(target)` — move toward target entity, stopping at `character.range` distance. Uses `move(x, y)` with vector math. Must NOT move to target's exact position.
- `kite(target, characterRange, hostileRange)` — maintain position within `characterRange` of target while staying outside `hostileRange` of the hostile targeting this character. Uses `move(x, y)`. The movement system passes both range values; the strategy computes the safe corridor.
- `flee(hostiles)` — move away from hostile entities. Uses `move(x, y)`.

### Movement Implementation Notes (from v2 and game-api.md)

- Use `real_x`/`real_y` for entity positions (interpolated, more accurate than `x`/`y` for moving entities).
- Use `target.moving ? target.going_x : target.real_x` for movement prediction.
- Calculate move distance proportional to `character.speed` and tick interval.
- Use normalized direction vectors with exact distance calculation — not binary near/far thresholds.
- Track an `isMoving` flag to prevent duplicate `smart_move()` calls. Cancel previous travel before starting new.

### `createSmartMoveStrategy()`

Phase 2 ships the smart-move wrapper strategy:

- `name`: `'smart-move'`
- `travel(destination)`: Calls `stop()` to cancel any in-progress travel, then returns `smart_move(destination)`.
- `approach(target)`: Calculate direction vector from character to target using `real_x`/`real_y`. Determine move distance as `min(character.speed * (interval/1000), currentDistance - character.range)`. If already within `character.range`, do nothing. Move along normalized vector by calculated distance.
- `kite(target, characterRange, hostileRange)`: Identify the hostile targeting this character. Calculate a position that is within `characterRange` of the current target AND outside `hostileRange` of the hostile. Use target position prediction (`going_x`/`going_y` if moving). Move along the safe corridor using `move(x, y)`. Continuous repositioning — not binary near/far.
- `flee(hostiles)`: Calculate average hostile position from `real_x`/`real_y`, move in opposite direction using `move(x, y)` scaled by `character.speed`.

## Context Dependencies

```yaml
writes: nothing

reads:
  ctx.objective:
    - type              # determines movement mode
    - location.coord    # travel destination { x, y, map }
  ctx.targeting:
    - attackTarget      # repositioning target (melee/ranged)
    - healTarget        # repositioning target (heal strategy)
  ctx.world:
    - hostileMonsters   # flee direction
    - hostilePlayers    # flee direction
  ctx.party:
    - tank                # tank name — if character.name !== tank, kite when targeted
  ctx.config:
    - thresholds.fleeHpPercent
```

## Behavior Contracts

### Invariants

1. Movement never writes to `ctx.world` or `ctx.targeting`.
2. Movement never calls `attack()`, `heal()`, or `use_skill()`.
3. Movement has exactly one active mode at any time.
4. Only one `smart_move` call is active at a time. A new travel request cancels the previous one.
5. The tick function never throws to the scheduler — all errors are caught and logged.
6. `approach()` never moves to the target's exact position — it stops at `character.range`.

### Travel Recovery

- If `smart_move` rejects, the system retries up to 3 times with 2-second backoff between attempts.
- After 3 failures, the system logs an error and enters idle mode.
- A new `travel()` call resets the retry counter.

### Combat Mode Safety

- Combat mode auto-expires if `ctx.targeting` has no targets (both attack and heal are null) for 2 consecutive ticks.
- This prevents movement from chasing a stale target reference after targeting clears.

### Flee Safety

- Flee mode is inviolable — combat and travel cannot override it.
- Flee mode auto-expires when `character.hp / character.max_hp > ctx.config.thresholds.fleeHpPercent * 1.5`.

### Error Handling

1. If `move()` throws, log and continue. Movement will retry on the next tick.
2. If `smart_move()` rejects, handle via retry logic above.
3. If `ctx.targeting` is not yet available (boot ordering), treat as no target (idle/travel behavior).
4. The tick never throws to the scheduler.

## Event Contracts

### Events Consumed

None in Phase 2. Movement reads `ctx.targeting` and `ctx.world` directly.

Phase 3 may add consumption of `objective:changed` for travel coordination.

### Events Emitted

None in Phase 2. Phase 3 may add `movement:arrived` for objective coordination.

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R9 (movement abstraction) | Consistent interface over travel and repositioning; game API calls isolated in strategy |
| R10 (travel vs repositioning) | Distinct modes with different behavior and tick frequencies |
| R12 (class-aware combat) | Melee hold ground vs ranged maintain distance; reactive kiting for non-tank under threat |
| R42 (explicit responsibilities) | Movement moves. Does not attack, heal, select targets, or use potions. |
| R44 (no silent failures) | All movement errors caught and logged with retry state |
| R47 (bounded loop ownership) | One scheduler registration; no internal timers |
