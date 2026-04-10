---
system: Objective
writes:
  ctx.objective:
    - type: string
    - target: string | null
    - location: Location | null
    - step: string | null
    - stepComplete: boolean
    - role: string
    - lastUpdated: number
reads:
  ctx.world:
    - entityLists
    - partyState
    - mapContext
  ctx.config:
    - farmTarget
    - roster
    - thresholds
    - restockThresholds
game_globals:
  - character
external:
  - "localStorage: farm target"
  - "localStorage: merchant status"
  - "localStorage: party coordination"
  - "localStorage: item catalogue"
  - "localStorage: gold baseline"
  - "localStorage: hunter gear requests"
  - "localStorage: hunter hunt state"
  - "localStorage: party stats"
---

# Objective Contract

## Identity

The Objective system decides what the bot should be doing and publishes that decision as shared context. It is the "brain" of the bot — other systems (Movement, Targeting, Attack) read `ctx.objective` to independently determine their behavior. Objective does NOT directly execute movement, attacks, or game interactions.

**Scheduling**: Registered as `'objective'` at ~1-2s interval. Not latency-sensitive — objective decisions are evaluated periodically, not reactively.

## Dependencies

- `ctx.world` — reads entity lists, party state, map context
- `ctx.config` — reads `farmTarget`, roster, thresholds
- `ctx.logger` — logs objective transitions
- `ctx.bus` — emits `objective:changed` for logging
- localStorage — reads/writes coordination data (farm target, merchant status, party directives, item catalogue, gold baseline, hunter gear requests, hunter hunt state)
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
- `'farm'` objective: resolve pack from `G.maps` by matching `target` monster type, extract zone center from `boundary` array. For MVP, search maps in order: mainland, mansion, spooky forest. Return first matching pack.
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
| `'hunt'` | Complete monster hunt assignment. | Hunt monster type | Hunt target location |
| `'follow'` | Follow user-controlled character (R60). | Leader name | `null` (dynamic) |
| `'event'` | Participate in a server event (R38). | Event type | Event location |

### Transition Logic

Evaluated each tick. Higher-priority conditions override lower:

1. **Dead** (`character.rip`) -> `'recover'`
2. **Active monster hunt** (merchant directed via CM, hunt timer not expired) -> `'hunt'` (temporarily overrides farm target)
3. **Farm target set** (`ctx.config.farmTarget` exists):
   - Not at farm location -> `'travel'` to farm location
   - At farm location -> `'farm'`
4. **No farm target** -> `'idle'`

Phase 3 implements `idle`, `farm`, `travel`, `recover`. Phase 4+ adds `hunt`. `follow` and `event` are deferred.

### Monster Hunt Acceptance (R37)

When no active hunt (`!character.s.monsterhunt`), hunter periodically travels to monsterhunt NPC, calls `interact("monsterhunt")`, and stores hunt state in localStorage (`al_bot:hunter:{name}:huntState`). This triggers merchant evaluation. If merchant responds with a viable hunt via CM, hunter's farm target is temporarily overridden to the hunt target. Hunt timer is ~30 min; expiry carries no penalty — hunter simply returns to normal farming.

### Trade-Slot Management (R55)

During idle/farm states, hunters evaluate potion levels and post needed items to game trade slots at 1g/item. This enables passive resupply when the merchant is nearby. Trade-slot management is a background task, not a separate objective type.

### Gear Request (R56)

Hunters periodically read the merchant's item catalogue from localStorage (`al_bot:merchant:itemCatalogue`). Using simple comparison (same item name + higher level = upgrade), hunters write gear requests to `al_bot:hunter:{name}:gearRequest`. Merchant gathers and delivers during resupply.

### `createHunterObjectiveStrategy()`

- `name`: `'hunter'`
- `evaluate(ctx, current)`: Evaluates transitions per the priority above. Returns `null` if no change needed, or a new objective object.
- `advanceStep()`: Not used for hunter (single-step objectives).

## Merchant Objective Strategy

### Available Objectives

| Type | Meaning | `target` | Steps |
|------|---------|----------|-------|
| `'idle'` | Monitor party status, evaluate what to do next. | `null` | none |
| `'restock'` | Resupply hunters with potions and gear, collect junk. | Party location | `travel-to-bank` -> `withdraw` -> `buy-potions` -> `gather-gear-requests` -> `travel-to-party` -> `deliver-potions` -> `deliver-gear` -> `collect-junk` -> `travel-to-bank` -> `deposit` -> `check-gold-baseline` |
| `'upgrade'` | Upgrade an item (stop at grade 1 scroll requirement). | Item to upgrade | `acquire-item` -> `acquire-scroll` -> `travel-to-upgrade` -> `execute` |
| `'compound'` | Compound items (stop at grade 1 scroll requirement). | Item to compound | `acquire-items` -> `acquire-scroll` -> `travel-to-upgrade` -> `execute` |
| `'sell'` | Sell items to Ponty for gold (R53). | Ponty location | `travel-to-ponty` -> `sell` |
| `'deliver'` | Deliver gear improvements to hunters (R56). | Hunter location | `gather-items` -> `travel-to-hunter` -> `trade` -> `collect-old` |
| `'hunt-eval'` | Evaluate hunter hunt viability (R37). | Hunt data | `read-hunts` -> `evaluate` -> `respond-cm` |
| `'bank-ops'` | Foundational bank operations (R58). | Bank location | `travel-to-bank` -> `deposit-gold` -> `store-items` -> `retrieve-items` |
| `'trade-fulfill'` | Stay near own character until trade fulfillment completes (R55). Trade system handles actual `trade_sell()`. | Nearby character | `wait-for-trades` |
| `'wander'` | Visit predefined locations for economy tasks. | Route | Per-location steps |

### Transition Logic

Evaluated each tick from `'idle'`:

1. **Dead** -> `'recover'`
2. **Nearby own characters have unfulfilled trade slots** -> `'trade-fulfill'` (opportunistic, no travel needed)
3. **Hunters need resupply** (localStorage status shows low potions or high inventory, or fixed interval ~5-30 min) -> `'restock'`
4. **Hunter hunt state needs evaluation** (localStorage hunt state exists, not yet evaluated) -> `'hunt-eval'`
5. **Have items to upgrade/compound** (inventory catalog evaluation, grade 0 scrolls only for MVP) -> `'upgrade'` or `'compound'`
6. **Inventory full or overflow items** -> `'sell'` (at Ponty — only NPC that buys items)
7. **Nothing to do** -> `'idle'` (continue monitoring, stand open near Ponty at ~(0,0) for visibility)

### Gold Baseline Management (R54)

Gold baseline tracks hunting profit, not total gold. During restock, the merchant records gold before collecting from hunters (`collect-junk` step). After hunters send items/gold via the Trade system, the difference is hunting profit. 10% of this profit is added to the baseline stored in localStorage (`al_bot:merchant:goldBaseline`). If baseline not set, initialize to current total gold (bank + on merchant). Lossy trade practices (R29) only operate with gold exceeding baseline.

### Multi-Step Workflow Progression

Merchant objectives use `step` and `stepComplete` for multi-step workflows:

1. Objective sets initial `step` (e.g., `'travel-to-bank'`).
2. Other systems react to the step:
   - Movement sees `location` and travels there.
3. Each tick, objective evaluates step completion via **state-verification guards** — checking real game state, not trusting async promises:
   - Travel steps: `nearLocation(coord, 50)`
   - `withdraw`: `countItem(potion) >= needed` for all deficit items
   - `buy-potions`: `countItem(potion) >= needed` for all deficit items
   - `deliver`: no more fulfillable buy requests in hunter's trade slots
   - `collect-junk`: inventory changed (item count increased) OR timeout (~15s)
   - `deposit`: character gold at/below threshold
   - `sell-items`: `classifyForSale(character.items).length === 0`
   - Synchronous steps (check-needs, check-baseline): complete immediately
4. When guard passes, `stepComplete = true`. `advanceStep()` progresses to next step.
5. Step-specific logic fires async operations (fire-and-forget). Guard re-checks each tick.
6. After final step, transitions back to `'idle'`.

**Sell approach**: Items are classified as for-sale explicitly using `classifyForSale()`. Only items positively identified as NPC-sellable are sold. The system does NOT use a sell-all-except-keepList approach.

**Trade-slot fulfillment**: Hunters post buy requests in trade slots at 1g/item. Merchant sells to those requests via `trade_sell()`. Actual trade execution is handled by the Trade system; the objective manages workflow sequencing.

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
    - charactersOfferingTrade  # trade-slot fulfillment (R55)
  ctx.config:
    - farmTarget
    - roster
    - thresholds
    - restockThresholds        # potion targets per hunter (R23)
external:
  localStorage:
    - al_bot:merchant:goldBaseline    # gold management (R54)
    - al_bot:merchant:itemCatalogue   # gear delivery (R56)
    - al_bot:hunter:{name}:huntState  # hunt evaluation (R37)
    - al_bot:hunter:{name}:gearRequest # gear requests (R56)
    - al_bot:party:{name}:status      # restock detection (R23)
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
| R37 (monster hunt) | Hunter hunt acceptance + merchant hunt evaluation via localStorage/CM |
| R42 (explicit responsibilities) | Objective publishes context. Does not move, attack, or target. |
| R44 (no silent failures) | All errors caught and logged |
| R51 (party travel sync) | Objective transitions account for party travel coordination needs |
| R52 (merchant stand) | Merchant strategy manages stand state for workflow transitions |
| R53 (NPC selling) | Sell objective uses Ponty interaction via utility |
| R54 (gold management) | Merchant strategy checks/updates gold baseline after resupply |
| R55 (trade-slot resupply) | Merchant fulfills own characters' trade-slot requests opportunistically |
| R56 (gear delivery) | Merchant gathers and delivers gear improvements during resupply |
| R58 (bank operations) | Foundational bank workflow steps reused across merchant objectives |
