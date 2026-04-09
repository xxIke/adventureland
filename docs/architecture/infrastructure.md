# Infrastructure

Non-domain components that support the system architecture. These are the shared backbone that domain systems depend on.

## Shared Context (`ctx`)

The context object is a plain JavaScript object created at boot and passed to every system. It is the single point of shared access — systems do not import each other directly.

```
ctx = {
  world:     {}                    // sole writer: WorldModel system
  objective: {}                    // sole writer: Objective system
  targeting: {}                    // sole writer: Targeting system
  bus:       EventBus instance     // pub/sub for logging signals only
  config:    Configuration object  // roster, thresholds, toggles
  scheduler: Scheduler instance    // system registration and lifecycle
  logger:    Logger instance       // structured logging
}
```

**Discipline**: Each `ctx.*` data slot has exactly one writer. Systems read shared context but only write to their own slot. The bus is for logging signals, not control flow. Game globals (`character`, `parent`, `G`) are accessed directly — they are not on `ctx`.

## Scheduler

The scheduler manages system registration, timing, and lifecycle. It is a dedicated component behind a contract, designed to iterate from simple to sophisticated.

**Core responsibilities**:
- System registration with name, tick function, interval, and priority
- Adaptive timing — systems return their next desired delay from tick functions
- Lifecycle control — `start()`, `stop()`, individual system pause/resume
- Timer ownership — all timers are tracked and cancelable via `stop()`

**Initial implementation**: Thin wrapper around `setTimeout`. Each registered system gets its own timer managed by the scheduler. `stop()` cancels all timers.

**Iteration path**: Priority enforcement, per-system timing instrumentation (how long each tick takes), stuck-system detection, pause/resume per system.

**Requirements**: R1, R2, R47

## Event Bus

Lightweight pub/sub for cross-system coordination signals. The bus is secondary to shared state reads — systems make decisions by reading `ctx.world`, not by reacting to events.

**Core responsibilities**:
- Subscribe to named events with callback
- Emit events with optional payload
- Unsubscribe (for cleanup on system stop)

**Design constraints**:
- Events are signals ("something happened"), not commands ("do this")
- Event handlers should be fast and non-blocking
- No guaranteed ordering between handlers for the same event
- Bus is cleared on `scheduler.stop()` to prevent stale handlers

**Requirements**: R8 (via party coordination signals)

## Configuration

Centralized configuration structure read by all systems. One place to update roster, thresholds, and toggles.

**Structure** (representative):
```
config = {
  roster: {
    merchant: 'characterName',
    hunters: ['hunter1', 'hunter2', 'hunter3'],
    allCharacters: { name: { class, role, ... } }
  },
  thresholds: {
    hpPotionPercent: 0.5,
    mpPotionPercent: 0.3,
    fleeHpPercent: 0.2,
    ...
  },
  toggles: {
    pvpDefense: true,
    autoUpgrade: false,
    ...
  },
  farmTarget: null  // overridden from localStorage
}
```

**Requirements**: R19, R20, R48

## localStorage Schema

localStorage serves dual purpose: state persistence for disconnect recovery and cross-character data sharing.

**Key naming convention**: `al_bot:{owner}:{key}`
- `owner` identifies which system writes the key
- No system reads a key it doesn't own without documented cross-reference

**Schema definition** (per key):
- Owner system
- Payload shape (what fields, what types)
- Freshness rules (how often refreshed, when considered stale)
- Purpose (recovery, cross-character sharing, or both)

**Planned keys** (defined per-component during contract authoring):
- `al_bot:party:status` — party member status snapshots
- `al_bot:objective:current` — current farming objective
- `al_bot:merchant:inventory` — merchant inventory snapshot
- `al_bot:config:farmTarget` — overridable farm target selection
- `al_bot:logging:snapshot` — periodic log/status snapshot

**Requirements**: R4, R46

## Utility Functions

Shared functions for game API interactions, standardized across systems. Utilities are NOT systems — they don't register with the scheduler or write to `ctx`. They are pure(ish) functions that strategies and systems call for common game interactions.

**Design principle**: Strategy logic lives in strategies. Bot/world interactions are standardized as utility functions employed by strategies. This ensures DRY implementations and enables slice iteration — improving a utility improves all strategies that use it.

**Planned utility categories**:

| Category | Functions | Used By |
|----------|-----------|---------|
| **Inventory** | `findInventoryIndexes()`, `findPotionSlot()`, `findEmptySlot()`, `catalogInventory()` | Potion/Regen, Objective (merchant strategy) |
| **Bank** | `depositItems()`, `retrieveItem()`, `depositJunk()` | Objective (merchant strategy) |
| **Vendor** | `buyItem()`, `sellItem()` | Objective (merchant strategy) |
| **Trade** | `findEmptyTradeSlot()`, `evaluateTrade()`, `sendItems()` | Objective (merchant strategy) |
| **Party** | `maintainParty()`, `isFriendly()`, `getActiveCharacters()` | Party, WorldModel |
| **Item evaluation** | `shouldUpgrade()`, `shouldCompound()`, `scoreItem()` | Objective (merchant strategy) |
| **Movement helpers** | `nearLocation()`, `isLocationObject()` | Movement, Objective |

Utilities are imported directly by the systems/strategies that need them — they are not on `ctx`.

**Requirements**: R49 (testable core logic separable from API calls)

## Build Pipeline

esbuild bundles multi-file source into a single output file for Adventure Land CODE deployment.

**Source structure**: `src/` with standard ES module imports
**Entry point**: `src/boot.js` — creates context, instantiates systems, registers with scheduler, starts
**Output**: Single bundled `.js` file, paste-able or uploadable to Adventure Land CODE
**Build command**: `npx esbuild src/boot.js --bundle --outfile=dist/bot.js --format=iife`

**Requirements**: R1, R43, R50
