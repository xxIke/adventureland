# Objective Contract

## Identity

The Objective system decides what the bot should be doing and publishes that decision as shared context. It is the "brain" of the bot — other systems (Movement, Targeting, Attack) read `ctx.objective` to independently determine their behavior. Objective does NOT directly execute movement, attacks, or game interactions.

**Scheduling**: Registered as `'objective'` at ~1-2s interval. Not latency-sensitive — objective decisions are evaluated periodically, not reactively.

## Dependencies

- `ctx.world` — reads entity lists, party state, map context
- `ctx.config` — reads `farmTarget`, roster, thresholds
- `ctx.logger` — logs objective transitions
- `ctx.bus` — emits `objective:changed` for logging
- localStorage — reads/writes coordination data (farm target, merchant status, party directives)
- Game globals: `character`

**Does NOT read** `ctx.targeting` or any combat system. Objective decisions are based on world state and configuration, not on what targeting has selected.

## Public Interface

### `createObjective(ctx, strategy)`

Creates and returns an Objective system instance. The returned object manages `ctx.objective`.

**Parameters:**
- `ctx` (object) — shared context
- `strategy` (object) — role strategy implementing the strategy interface

**Returns:** Object with:
- `tick()` — evaluation function registered with scheduler
- `getState()` — returns current objective state for diagnostics

### `objective.tick()`

Main evaluation tick:

1. **Death check**: If `character.rip`, set objective type to `'recover'`, return.
2. **Read inputs**: Read `ctx.world`, `ctx.config`, localStorage coordination data.
3. **Evaluate**: Call `strategy.evaluate(ctx, currentObjective)`. The strategy examines world state, config, coordination data, and the current objective to decide if a transition is needed.
4. **Apply**: If strategy returns a new objective, update `ctx.objective` and emit `objective:changed`. If no change, update `ctx.objective.lastUpdated`.
5. **Step progression**: For multi-step workflows, check if `stepComplete` is true. If so, call `strategy.advanceStep(ctx, currentObjective)` to get the next step.

**Returns:** void (not adaptive).

### `objective.getState()`

**Returns:** Current `ctx.objective` value.

## Objective State Shape (`ctx.objective`)

After each tick, `ctx.objective` is populated with:

```
ctx.objective = {
  type: string,              // current objective identifier (see objective types per strategy below)
  target: string | null,     // monster type string for farm objectives (e.g., 'goo', 'bee'); null otherwise
  location: Location | null, // where this objective/step takes place; null = no specific location
  step: string | null,       // current step within multi-step objectives; null for single-step
  stepComplete: boolean,     // has the current step been accomplished
  role: string,              // 'hunter' | 'merchant'
  lastUpdated: number,       // Date.now()
}
```

### Location Object

The `location` field is a structured object that contains coordinates and can be extended with additional context as objectives evolve:

```
Location = {
  coord: { x: number, y: number, map: string },  // physical destination
}
```

The `coord` field is the primary data — Movement reads it to determine travel destination and whether the character has arrived. The Location object is intentionally extensible; future objective needs (e.g., zone boundaries, arrival radius, waypoints) can be added as sibling fields to `coord` without changing the core contract.

**Resolution**: Objective resolves location from game data when setting an objective:
- `'farm'` objective: resolve pack from `G.maps` by matching `target` monster type, extract zone center from `boundary` array
- Merchant step locations: resolve NPC positions from `G.maps[mapName].npcs[]`
- `null` when the objective doesn't require being at a specific place

**Field semantics:**
- `type` — identifies the objective. Determines how other systems behave (targeting mode, movement mode).
- `target` — the farm target monster type string. Used by WorldModel (via config) for `targetMonsters` categorization. Only meaningful for `'farm'` objectives; `null` otherwise.
- `location` — structured location object with `coord` for the physical destination. Movement reads `location.coord` to decide if travel is needed. `null` means no specific location required.
- `step`/`stepComplete` — multi-step workflow tracking for merchant objectives. `null`/`false` for single-step objectives.

### How Other Systems Read `ctx.objective`

| System | What it reads | How it affects behavior |
|--------|---------------|----------------------|
| **Movement** | `type`, `location.coord` | If `location` set and not at `coord`: travel. At coord with target: combat. No location: idle. |
| **Targeting** | full `ctx` (reads `type`) | farm = full chain; travel = defensive + easy opportunistic; recover = none |
| **Attack** | reads `ctx.targeting` only | If targeting returns null, attack idles automatically |
| **Party** | `type`, `target` | Publishes current objective in status snapshots |

## Hunter Objective Strategy

### Available Objectives

| Type | Meaning | `target` | `location` |
|------|---------|----------|------------|
| `'idle'` | Nothing to do. Waiting for directives. | `null` | `null` |
| `'farm'` | Farm monsters at a location. | Monster type string | Pack/zone location |
| `'travel'` | Travel to a new location. | Destination | Destination |
| `'recover'` | Character died or HP critical. Respawn/recover. | `null` | Safe location or spawn |
| `'follow'` | Follow party leader. | Leader name | `null` (dynamic) |
| `'event'` | Participate in a server event. | Event type | Event location |

### Transition Logic

Evaluated each tick. Higher-priority conditions override lower:

1. **Dead** (`character.rip`) -> `'recover'`
2. **Farm target set** (`ctx.config.farmTarget` exists):
   - Not at farm location -> `'travel'` to farm location
   - At farm location -> `'farm'`
3. **No farm target** -> `'idle'`

Phase 3 implements `idle`, `farm`, `travel`, `recover`. `follow` and `event` are deferred.

### `createHunterObjectiveStrategy()`

- `name`: `'hunter'`
- `evaluate(ctx, current)`: Evaluates transitions per the priority above. Returns `null` if no change needed, or a new objective object.
- `advanceStep()`: Not used for hunter (single-step objectives).

## Merchant Objective Strategy

### Available Objectives

| Type | Meaning | `target` | Steps |
|------|---------|----------|-------|
| `'idle'` | Monitor party status, evaluate what to do next. | `null` | none |
| `'restock'` | Resupply hunters with potions, collect junk. | Party location | `travel-to-bank` -> `withdraw` -> `buy-potions` -> `travel-to-party` -> `deliver` -> `collect-junk` -> `travel-to-bank` -> `deposit` |
| `'upgrade'` | Upgrade an item. | Item to upgrade | `acquire-item` -> `acquire-scroll` -> `travel-to-upgrade` -> `execute` |
| `'compound'` | Compound items. | Item to compound | `acquire-items` -> `acquire-scroll` -> `travel-to-upgrade` -> `execute` |
| `'sell'` | Sell overflow inventory to NPCs. | Sell location | `travel-to-vendor` -> `sell` |
| `'wander'` | Visit predefined locations for economy tasks. | Route | Per-location steps |

### Transition Logic

Evaluated each tick from `'idle'`:

1. **Dead** -> `'recover'`
2. **Hunters need potions** (localStorage inventory check shows low potions) -> `'restock'`
3. **Have items to upgrade/compound** (inventory catalog evaluation) -> `'upgrade'` or `'compound'`
4. **Inventory full** -> `'sell'`
5. **Nothing to do** -> `'idle'` (continue monitoring)

### Multi-Step Workflow Progression

Merchant objectives use `step` and `stepComplete` for multi-step workflows:

1. Objective sets initial `step` (e.g., `'travel-to-bank'`).
2. Other systems react to the step:
   - Movement sees `location` and travels there.
   - When arrived, objective detects arrival (e.g., `nearLocation(bankLocation)`) and sets `stepComplete = true`.
3. On next tick, `advanceStep()` progresses to next step (e.g., `'withdraw'`).
4. Objective executes step-specific logic using utility functions (e.g., `depositJunk()`, `buyItem()`).
5. When step completes, sets `stepComplete = true`. Cycle continues.
6. After final step, transitions back to `'idle'`.

### `createMerchantObjectiveStrategy()`

- `name`: `'merchant'`
- `evaluate(ctx, current)`: From idle, scans for work. During active objectives, monitors step progress. Returns new objective or null.
- `advanceStep(ctx, current)`: Returns the next step for multi-step workflows.

Phase 4 implements the merchant strategy. Phase 3 implements the hunter strategy only.

## Context Dependencies

```yaml
writes:
  ctx.objective:
    type: string
    target: string | null
    location: Location | null   # { coord: { x, y, map } }
    step: string | null
    stepComplete: boolean
    role: string
    lastUpdated: number

reads:
  ctx.world:
    - partyMembers
    - hostileMonsters
    - hostilePlayers
  ctx.config:
    - farmTarget
    - roster
    - thresholds
```

## Behavior Contracts

### Invariants

1. Objective is the **sole writer** to `ctx.objective`. No other system writes to it.
2. Objective never calls `attack()`, `heal()`, `move()`, or `smart_move()` directly.
3. Objective may call utility functions for game interactions during merchant workflow steps (bank, vendor, trade) — these are step execution, not movement/combat.
4. `ctx.objective` is updated every tick (`lastUpdated` is always fresh), even if the objective hasn't changed.
5. The tick function never throws to the scheduler.

### Error Handling

1. If `strategy.evaluate()` throws, log the error and maintain current objective.
2. If localStorage reads fail, use defaults (no farm target = idle).
3. If a multi-step workflow step fails, log and retry on next tick. After 3 failures on the same step, transition back to idle with error log.
4. The tick never throws to the scheduler.

## Event Contracts

### Events Emitted

| Event | Payload | When |
|-------|---------|------|
| `objective:changed` | `{ from: string, to: string, target: any }` | Objective type transitions |

This event is for logging only. Systems read `ctx.objective` for decisions.

### Events Consumed

None. Reads localStorage and CM messages for coordination data.

## Leadership and Coordination

- **Merchant** is the system leader. It has lowest combat overhead and can dedicate cycles to evaluating party-wide objectives. It writes farm target and coordination directives to localStorage for hunters to read.
- **Tank** is the combat leader for attack coordination (Phase 3 targeting deduplication, aggro coordination).
- **Hunters** read farm target from `ctx.config.farmTarget` (loaded from localStorage at boot, updateable at runtime).

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R15 (separated intent and execution) | Objective decides what; Movement/Targeting/Attack decide how |
| R16 (universal and role-specific states) | Shared states (idle, recover) + role catalogs (hunter, merchant) |
| R21-R29 (merchant) | Merchant strategy with multi-step workflows and utility functions |
| R30 (party-capability targeting) | Merchant strategy evaluates party state for farm target selection |
| R31 (objective type distinction) | Strategy supports multiple objective types per role |
| R42 (explicit responsibilities) | Objective publishes context. Does not move, attack, or target. |
| R44 (no silent failures) | All errors caught and logged |
