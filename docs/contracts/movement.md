---
system: Movement
writes: nothing
reads:
  ctx.objective:
    - type
    - location.coord
    - location.boundary
  ctx.targeting:
    - attackTarget
    - healTarget
  ctx.world:
    - hostileMonsters
    - hostilePlayers
    - partyMembers
  ctx.party:
    - tank
    - travelSync
  ctx.config:
    - thresholds.fleeHpPercent
game_globals:
  - character
  - move()
  - smart_move()
  - stop()
  - distance()
  - can_move_to()
  - open_stand()
  - close_stand()
  - cruise()
  - use()
---

# Movement Contract

---

## 1. Identity & Scheduling

The Movement system handles all character movement — long-distance travel, combat repositioning, kiting, and fleeing. It provides a consistent interface (R9) over the game's movement APIs and maintains distinct modes for different movement needs (R10).

**Scheduling**: Registered as `'movement'` at ~250ms interval. Adaptive — returns shorter delays when actively repositioning or fleeing, longer delays when traveling or idle.

**Dependencies**:
- `ctx.objective` — reads objective type and location to determine mode (travel vs combat vs idle)
- `ctx.targeting` — reads `attackTarget`, `healTarget` for repositioning relative to current target
- `ctx.world` — reads `hostileMonsters`, `hostilePlayers` for flee direction; `partyMembers` for flee-toward-party and kite-toward-safety
- `ctx.party` — reads `tank` to determine if this character is the tank (affects kite decision); reads `travelSync` for speed matching
- `ctx.config` — reads `thresholds.fleeHpPercent`
- `ctx.logger` — logs movement decisions, travel state, errors
- Game globals: `character`, `move()`, `smart_move()`, `stop()`, `distance()`, `can_move_to()`, `cruise()`, `use()`

---

## 2. External Interface

This section defines the stable contract that other systems depend on. These behaviors are guaranteed regardless of internal strategy implementation.

### `createMovement(ctx, strategy)`

Creates and returns a Movement system instance.

**Parameters:**
- `ctx` (object) — shared context
- `strategy` (object) — movement strategy implementing the strategy interface (Section 3)

**Returns:** Object with:
- `tick()` — main movement loop, registered with scheduler
- `stop()` — cancel current movement
- `getState()` — returns current movement state for diagnostics

### Mode Priority

Modes have a strict priority: `flee` > `combat` > `travel` > `idle`.

- Flee activates when HP is critically low and character is being targeted. Flee is **inviolable** — no other mode can override it.
- Combat repositioning activates when the targeting system has a target. Overrides travel.
- Travel resumes when higher-priority modes expire.
- Movement evaluates mode priority each tick based on current state — it does not rely on external events to set modes.

### Universal Combat Positioning Rule

All combat movement (approach, kite, flee) must validate destinations with `can_move_to()` before committing. If the intended position is blocked, iterate to find a valid alternative direction. This is a contract-level guarantee, not an implementation detail.

### Flee Mode

**Activation**: `character.targets > 0` AND `character.hp / character.max_hp < ctx.config.thresholds.fleeHpPercent`

**Behavior**:
- Call `strategy.flee()` with nearby hostile entities from `ctx.world.hostileMonsters` and `ctx.world.hostilePlayers`, and context opts including party member positions.
- Prefer direction toward party centroid when `ctx.world.partyMembers` is populated.
- Validate destination with `can_move_to()`; iterate directions if blocked.
- If flee fails repeatedly (cornered), `use("town")` as emergency teleport escape.
- Auto-exit: if `character.hp / character.max_hp > ctx.config.thresholds.fleeHpPercent * 1.5`, exit flee mode.

**Returns**: `{ delay: 100 }`

### Combat Mode

**Activation**: `ctx.targeting.attackTarget` or `ctx.targeting.healTarget` is not null.

**Behavior**:
- Read target from `ctx.targeting`. Effective range for the target is `character.range`.

- **Approach**: If distance to target > `character.range * 0.8`, call `strategy.approach(target, opts)`. Approach stops at `character.range * 0.8` distance — never moves to target's exact position. Uses target position prediction (`going_x`/`going_y` when `target.moving`). Validates with `can_move_to()`; iterates for valid alternative if blocked.

- **Hold ground**: Once within `character.range * 0.8`, no further movement toward target. Responsive movement is maintained — no dead zone. Character re-approaches immediately when pushed out of effective range.

- **Kite check** (reactive): If `character.targets > 0` (being targeted by a hostile) AND (this character is not the party tank OR character is ranged):
  - Identify hostile entities targeting this character.
  - If multiple attackers: use the **nearest** attacker as the kite reference entity.
  - Determine the attacker's movement vector (direction of travel from position data).
  - Steer up to ±90° from the attacker's vector to a position that maintains range with the attack/heal target AND is a valid move (`can_move_to()`). If blocked, iterate angles to find valid alternative.
  - Maintain distance of `character.range * 0.9` from target (buffer for entity movement).
  - Vector length = `character.speed * (delay / 1000)` — max distance the character can move before the next tick.
  - If range with attack/heal target cannot be maintained while kiting, move as close as possible to the target.
  - If hostile IS the current target: maintain a band between `hostile.range` and `character.range`.
  - Always kite regardless of range comparison with attacker — kiting when outranged still increases distance and improves flee viability.
  - Call `strategy.kite(target, attackerEntity, opts)`. Strategy reads `character.range` directly. Opts include farm boundary and party positions.

- Auto-exit: if targeting clears (both targets null) for 2 consecutive ticks, exit combat mode.

- **Combat movement vector length**: All combat movement (kite, approach, reposition) should calculate vector length as `character.speed * (delay / 1000)` — how far the character can actually move before the next tick. This is essential for projecting both character and enemy positions.

**Returns**: `{ delay: 200 }`

### Travel Mode

**Activation**: `ctx.objective.location` is set and character is not at that location.

**Behavior**:
- Read destination from `ctx.objective.location.coord` (a `{ x, y, map }` position object).
- If not currently moving, call `strategy.travel(destination)`.
- If travel promise resolves, log arrival. Objective will detect arrival and update on its next tick.
- If travel promise rejects, increment retry counter. Retry up to 3 times with backoff.
- After total failure, attempt town teleport (`use("town")`) and retry once more.
- Contract specifies "travel to coord" — does NOT specify which game API or pathfinding method. This is an internal strategy concern.

**Returns**: `{ delay: 1000 }`

### Idle Mode

- No active movement need.
- **Returns**: `{ delay: 500 }`

### Merchant Stand Management (R52)

For merchant characters, the Movement system manages stand lifecycle around movement:

1. **Before any movement** (travel, repositioning, flee): Ensure stand is closed before moving. Call `closeStand()` utility if stand is open. This applies to ALL movement including short NPC repositioning during workflow steps.
2. **After merchant travel completes** (arrived at destination): Call `openStand()` utility to reopen the stand.
3. Stand state is checked at the beginning of each tick when movement is needed.

Movement's responsibility is the movement lifecycle: ensure closed before move, open after merchant travel arrival. Other systems may also interact with stand management utilities for their own purposes (e.g., Objective opening stand at idle position). Stand utilities are shared — see infrastructure.md.

### Party Travel Sync (R51)

During group travel, Movement reads `ctx.party.travelSync` for speed matching:
- If `travelSync.active` is true, call `cruise(travelSync.slowestSpeed)` before initiating travel to cap movement speed.
- On travel arrival or failure, call `cruise(500)` to reset to full speed.
- Merchant stand must close before travel sync movement (R52).
- Each character uses the movement system to coordinate travel independently. MVP uses `smart_move()` internally. Future: coordinated waypoints (out of MVP scope).

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

---

## 3. Internal Strategy

This section describes how movement executes its responsibilities. Internal details are subject to change as pathfinding and positioning improve. **Other systems must not depend on strategy internals.**

The strategy object encapsulates movement implementation. The movement system selects modes and provides context; the strategy executes movement. Strategy internals (smart_move, custom pathfinding, move() vector math, etc.) are not part of the external contract.

### Movement Strategy Interface

A movement strategy is a plain object with these methods (D3, R9):

```
{
  name: string,
  travel(destination) -> Promise,
  approach(target, opts) -> void,
  kite(target, attackerEntity, opts) -> void,
  flee(hostiles, opts) -> void,
}
```

- `name` — string identifier for logging (e.g., `'smart-move'`, `'pathfinding'`)
- `travel(destination)` — execute long-distance travel to `{ x, y, map }`. Returns a promise that resolves on arrival or rejects on failure. Implementation may use smart_move, custom pathfinding, or any other mechanism.
- `approach(target, opts)` — move toward target entity, stopping at effective range. Uses `move(x, y)` with vector math. Must NOT move to target's exact position. Must validate with `can_move_to()`.
- `kite(target, attackerEntity, opts)` — maintain position within range of target while evading the attacker. Strategy reads `character.range` directly. Uses `move(x, y)` with `can_move_to()` validation. Steers up to ±90° from attacker's movement vector. Must iterate angles if preferred direction is blocked.
- `flee(hostiles, opts)` — move away from hostile entities. Uses `move(x, y)`. Must validate with `can_move_to()` and iterate if blocked.

### Strategy `opts` Parameter

The movement system passes an `opts` object to strategy methods with context needed for smart positioning:

```
{
  farmBoundary: [x1, y1, x2, y2] | null,  // from ctx.objective.location.boundary
  partyPositions: [{ x, y }] | null,       // from ctx.world.partyMembers positions
  rangeBuffer: number,                       // approach: 0.8, kite: 0.9
}
```

This keeps the strategy interface stable while allowing richer behavior without expanding method signatures.

### Movement Implementation Notes

- Use `real_x`/`real_y` for entity positions (interpolated, more accurate than `x`/`y` for moving entities).
- Use `target.moving ? target.going_x : target.real_x` for movement prediction.
- Calculate move distance proportional to `character.speed` and tick interval.
- Use normalized direction vectors with exact distance calculation — not binary near/far thresholds.
- Track an `isMoving` flag to prevent duplicate `smart_move()` calls. Cancel previous travel before starting new.

### `createSmartMoveStrategy(ctx)`

Current MVP strategy using the game's smart_move for travel:

- `name`: `'smart-move'`
- `travel(destination)`: Calls `stop()` to cancel any in-progress travel, then returns `smart_move(destination)`.
- `approach(target, opts)`: Calculate direction vector from character to target using `real_x`/`real_y` (and `going_x`/`going_y` when `target.moving` for prediction). Determine move distance as `min(character.speed * (interval/1000), currentDistance - character.range * opts.rangeBuffer)`. If already within effective range, do nothing. Move along normalized vector. Validate with `can_move_to()`; iterate if blocked.
- `kite(target, attackerEntity, opts)`: Identify attacker's movement vector. Calculate angles from 0° to ±90°. Score each candidate position on: range maintenance with target, `can_move_to()` validity, farm boundary containment (if `opts.farmBoundary`), proximity to party (if `opts.partyPositions`). Select highest-scoring valid position. If no valid kite position, approach target instead.
- `flee(hostiles, opts)`: Calculate average hostile position. Determine flee direction (toward party centroid if `opts.partyPositions`, else away from hostiles). Validate with `can_move_to()`. If blocked, iterate angles until valid direction found.

---

## 4. Location Service Reference

Movement does NOT own location resolution. The location service (`src/location.js`) is a separate shared utility — see `docs/contracts/location.md`.

- Objective system uses location service to set `ctx.objective.location`
- Movement reads `ctx.objective.location.coord` — never resolves locations itself
- Location service provides: `resolveLocation()`, `findNPCLocation()`, `findMonsterLocation()`, `getMonsterSpawns()`, `getMapTransitions()`

---

## 5. Behavior Contracts

### Invariants

1. Movement never writes to `ctx.world` or `ctx.targeting`.
2. Movement never calls `attack()`, `heal()`, or `use_skill()`.
3. Movement has exactly one active mode at any time.
4. Only one `smart_move` call is active at a time. A new travel request cancels the previous one.
5. The tick function never throws to the scheduler — all errors are caught and logged.
6. `approach()` never moves to the target's exact position — it stops at effective range.
7. All combat movement validates destinations with `can_move_to()` and iterates for valid alternatives when blocked.

### Travel Recovery

- If travel fails, the system retries up to 3 times with backoff between attempts.
- After total failure, attempt town teleport via `use("town")` and retry once more.
- A new travel destination resets the retry counter.

### Combat Mode Safety

- Combat mode auto-expires if `ctx.targeting` has no targets (both attack and heal are null) for 2 consecutive ticks.
- This prevents movement from chasing a stale target reference after targeting clears.

### Flee Safety

- Flee mode is inviolable — combat and travel cannot override it.
- Flee mode auto-expires when `character.hp / character.max_hp > ctx.config.thresholds.fleeHpPercent * 1.5`.
- If flee is cornered (no valid `can_move_to()` direction after iterating), `use("town")` as emergency escape.

### Error Handling

1. If `move()` targets an invalid position, `can_move_to()` prevents the call. If validation is missed and `move()` fails, log and continue — movement will retry on the next tick.
2. If travel rejects, handle via retry logic above.
3. If `ctx.targeting` is not yet available (boot ordering), treat as no target (idle/travel behavior).
4. The tick never throws to the scheduler.

---

## 6. Context Dependencies

```yaml
writes: nothing

reads:
  ctx.objective:
    - type              # determines movement mode
    - location.coord    # travel destination { x, y, map }
    - location.boundary # optional farm zone boundary for kite containment
  ctx.targeting:
    - attackTarget      # repositioning target (melee/ranged)
    - healTarget        # repositioning target (heal strategy)
  ctx.world:
    - hostileMonsters   # flee direction
    - hostilePlayers    # flee direction
    - partyMembers      # flee-toward-party, kite-toward-safety
  ctx.party:
    - tank              # tank name — if character.name !== tank, kite when targeted
    - travelSync        # speed matching during group travel (R51)
  ctx.config:
    - thresholds.fleeHpPercent
```

---

## 7. Event Contracts

### Events Consumed

None. Movement reads `ctx.targeting` and `ctx.world` directly.

### Events Emitted

None. Phase 3 may add `movement:arrived` for objective coordination.

---

## 8. Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R9 (movement abstraction) | Consistent interface over travel and repositioning; game API calls isolated in strategy. External contract agnostic of internal implementation. |
| R10 (travel vs repositioning) | Distinct modes with different behavior and tick frequencies |
| R12 (class-aware combat) | Melee hold ground at range * 0.8; ranged maintain distance at range * 0.9; reactive kiting for non-tank under threat |
| R33 (map POI) | Location service provides queryable locations — movement consumes via ctx.objective.location |
| R34 (NPC navigation) | Location service resolves NPC coordinates — movement travels to them |
| R42 (explicit responsibilities) | Movement moves. Does not attack, heal, select targets, or use potions. |
| R44 (no silent failures) | All movement errors caught and logged with retry state |
| R47 (bounded loop ownership) | One scheduler registration; no internal timers |
| R51 (party travel sync) | Speed matching via `cruise()` and `ctx.party.travelSync` during group travel |
| R52 (merchant stand) | Close stand before all movement, reopen at destination |
