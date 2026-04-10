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
    recoveryEnabled: false,  // dev/prod flag: read persisted state on boot (R4)
    ...
  },
  restockThresholds: {
    potionsPerHunter: { hpot0: 100, hpot1: 20 },  // target potion counts (R23)
  },
  farmTarget: null  // overridden from localStorage
}
// Note: gold baseline target (R54) is stored in localStorage as mutable merchant state, not in config.
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

**Schema** (defined per-component during contract authoring):
- `al_bot:party:{name}:status` — party member status snapshots (includes inventory summary for restock detection)
- `al_bot:objective:current` — current farming objective
- `al_bot:merchant:inventory` — merchant inventory snapshot
- `al_bot:merchant:itemCatalogue` — bank item catalogue for gear delivery (R21, R56). Owner: Objective (merchant). Shape: `{ items: [{name, level, slot, pack}], lastUpdated }`. Freshness: updated after each bank visit.
- `al_bot:merchant:goldBaseline` — gold baseline target for profit allocation (R54). Owner: Objective (merchant). Shape: `{ target: number, lastUpdated }`. Freshness: updated after each resupply cycle.
- `al_bot:hunter:{name}:huntState` — current monster hunt assignment (R37). Owner: Objective (hunter). Shape: `{ monster, count, remaining, expiry, evaluated }`. Freshness: updated on hunt acceptance, cleared on completion/expiry.
- `al_bot:hunter:{name}:gearRequest` — gear upgrade requests (R56). Owner: Objective (hunter). Shape: `{ requests: [{name, level, slot}], lastUpdated }`. Freshness: updated when hunter evaluates catalogue.
- `al_bot:party:stats` — party-wide computed stats (tank, DPS). Owner: Objective (merchant). Shape: `{ tank: string, basic_dps: number, lastUpdated: number }`. Freshness: updated when party membership changes. Expandable for future cached party heuristics.
- `al_bot:config:farmTarget` — overridable farm target selection
- `al_bot:logging:snapshot` — periodic log/status snapshot

**Requirements**: R4, R46

## Utility Functions

Shared functions for game API interactions, standardized across systems. Utilities are NOT systems — they don't register with the scheduler or write to `ctx`. They are pure(ish) functions that strategies and systems call for common game interactions.

**Design principle**: Strategy logic lives in strategies. Bot/world interactions are standardized as utility functions employed by strategies. This ensures DRY implementations and enables slice iteration — improving a utility improves all strategies that use it.

**Utility function signatures** (derived from previous implementations in `../hyper-fixate/codes/`):

Each function includes intent, parameters, and return documentation to prevent conflation during implementation.

### Inventory Utilities

Used by: Potion/Regen, Objective (merchant strategy)

```
findItemSlots(itemName, inv?)
  Intent: Find all inventory slot indices containing items matching the given name.
  Params: itemName (string) — item name to search for
          inv (array, optional) — inventory array to search, defaults to character.items
  Returns: number[] — array of slot indices (0-based), empty if not found

findPotionSlot(potionType, tier)
  Intent: Find the last inventory slot containing a specific potion type/tier, for swap-before-use.
  Params: potionType (string) — "hp" or "mp"
          tier (string) — potion tier name (e.g., "hpot0", "hpot1", "hpotx")
  Returns: number|null — slot index of the last matching potion, or null if not found

findEmptySlot(inv?)
  Intent: Find first empty (null) slot in inventory.
  Params: inv (array, optional) — inventory array, defaults to character.items
  Returns: number|null — slot index, or null if inventory is full

countItem(itemName, inv?)
  Intent: Count total quantity of an item across inventory (respects q for stackable items).
  Params: itemName (string) — item name to count
          inv (array, optional) — inventory array, defaults to character.items
  Returns: number — total quantity (0 if not found)

catalogInventory(inv)
  Intent: Build item catalogue from inventory or bank, grouping by name and level for equipment.
  Params: inv (array) — inventory array to catalogue
  Returns: object — { [name]: { [level]: count, max: number } } for equipment,
           { [name]: number } for stackables
```

### Equipment/Gear Utilities

Used by: Objective (merchant + hunter strategy)

```
isUpgrade(candidate, equipped)
  Intent: Determine if candidate item is an upgrade over currently equipped item.
          MVP: same name + higher level = upgrade. Multi-slot (ring1/ring2, earring1/earring2)
          requires comparing against both slots.
  Params: candidate (object) — item object with {name, level}
          equipped (object|null) — currently equipped item, or null if slot is empty
  Returns: boolean — true if candidate is better

getSlotForItem(itemName)
  Intent: Determine which equipment slot an item belongs to using G.items and G.classes data.
  Params: itemName (string) — item name to look up
  Returns: string|undefined — slot name (e.g., "mainhand", "ring1"), undefined if not equippable

getClassWeaponTypes(ctype?)
  Intent: Get valid weapon/item types per equipment slot for a character class.
  Params: ctype (string, optional) — class type, defaults to character.ctype
  Returns: object — { [slot]: string[] } mapping slot names to valid item types
```

### Movement/Position Utilities

Used by: Movement, Objective

```
nearLocation(target, maxDist?)
  Intent: Check if character is within distance of a target location, accounting for map.
  Params: target (object) — { x, y, map? } location to check
          maxDist (number, optional) — maximum distance, default 10
  Returns: boolean — true if within distance and on same map

getUnitVectorTo(point)
  Intent: Calculate unit vector from character's current position toward a point.
  Params: point (object) — { x, y } target point
  Returns: object — { x, y } normalized unit vector

getUnitVectorFrom(point)
  Intent: Calculate unit vector from a point away toward character (opposite of getUnitVectorTo).
  Params: point (object) — { x, y } source point
  Returns: object — { x, y } normalized unit vector pointing away from the point
```

### Monster/Farming Utilities

Used by: Objective (merchant + hunter strategy), targeting evaluation

```
estimateDPS(attacker, target?)
  Intent: Estimate damage per second for an attacker, factoring damage type and target armor/resistance.
          Uses attack * frequency * damage_mult * hit_rate formula.
  Params: attacker (object) — entity or G.monsters entry with {attack, frequency, damage_type}
          target (object, optional) — entity with {armor, resistance} for damage reduction calc
  Returns: number — estimated DPS

estimateTTK(monsterType, partyDPS)
  Intent: Estimate time to kill a monster type at level 1 stats using party DPS.
  Params: monsterType (string) — monster type key for G.monsters lookup
          partyDPS (number) — combined party DPS from estimateDPS
  Returns: number — estimated milliseconds to kill

canFight(monsterType, partyStats)
  Intent: MVP farmability boolean — can the party survive and kill this monster type.
          Simple comparison: can party sustain against monster DPS and kill within reasonable time.
  Params: monsterType (string) — monster type key
          partyStats (object) — { basic_dps, tank, ... } from al_bot:party:stats
  Returns: boolean — true if party is projected to win

getFarmabilityData(monsterType, partyStats)
  Intent: Calculate farmability data for a monster type. MVP returns data for future decision-making,
          NOT comparative ROI. Each value calculated by dedicated functions for independent tuning.
  Params: monsterType (string) — monster type key
          partyStats (object) — party stats from localStorage
  Returns: object — { can_fight: boolean, gold_gain: number, xp_gain: number }
           gold_gain = gold(lvl1) / ttk(lvl1), xp_gain = xp(lvl1) / ttk(lvl1)
```

### Stand Management Utilities

Used by: Movement, Objective (merchant strategy), potentially other systems

```
openStand()
  Intent: Open merchant stand for trading. Wrapper over game API open_stand().
  Returns: void

closeStand()
  Intent: Close merchant stand. Wrapper over game API close_stand().
  Returns: void

isStandOpen()
  Intent: Check if merchant stand is currently open via character.stand property.
  Returns: boolean — true if stand is open
```

### Skill/Combat Utilities

Used by: Combat Skills, Potion/Regen

```
isOnCooldown(skillName)
  Intent: Check if a skill is on cooldown, following the G.skills share chain.
          Wraps game API is_on_cooldown() for consistent interface.
  Params: skillName (string) — skill name to check
  Returns: boolean — true if skill is on cooldown

getCooldownRemaining(skillName)
  Intent: Calculate milliseconds remaining until a skill is available.
  Params: skillName (string) — skill name to check
  Returns: number — ms remaining (0 if available)
```

### Party/Entity Utilities

Used by: Party, WorldModel

```
isFriendly(entity)
  Intent: Check if an entity belongs to a friendly player (same owner or in friendlyPlayers config).
  Params: entity (object) — entity to check, must have entity.owner
  Returns: boolean — true if entity is owned by a friendly player

getActiveCharacters(roster)
  Intent: Filter roster to only online characters.
  Params: roster (object) — roster config with characters map { name -> { online } }
  Returns: string[] — array of online character names
```

### Bank Operations (Phase 4, signatures only)

Used by: Objective (merchant strategy)

```
depositItems(whitelist)
  Intent: Deposit non-whitelisted items into bank.
  Params: whitelist (string[]) — item names to keep in inventory

retrieveItem(itemName, count)
  Intent: Retrieve specific items from bank vaults.
  Params: itemName (string), count (number)

depositJunk(goldThreshold, whitelist)
  Intent: Deposit excess gold and non-whitelisted items during bank visit.
  Params: goldThreshold (number), whitelist (string[])
```

### NPC/Vendor Utilities (Phase 4, signatures only)

Used by: Objective (merchant strategy)

```
buyItem(itemName, quantity)
  Intent: Purchase item from nearby NPC vendor.

sellItem(slot, quantity?)
  Intent: Sell item to nearby NPC vendor (Ponty).

findSellableItems(keepList)
  Intent: Identify inventory items that should be sold to NPC.
```

### Gold Management Utilities (Phase 4, signatures only)

Used by: Objective (merchant strategy)

```
getGoldBaseline()
  Intent: Read current gold baseline target from localStorage.

updateGoldBaseline(newTarget)
  Intent: Write updated gold baseline to localStorage.
```

Utilities are imported directly by the systems/strategies that need them — they are not on `ctx`.

**Requirements**: R49 (testable core logic separable from API calls)

## Build Pipeline

esbuild bundles multi-file source into a single output file for Adventure Land CODE deployment.

**Source structure**: `src/` with standard ES module imports
**Entry point**: `src/boot.js` — creates context, instantiates systems, registers with scheduler, starts
**Output**: Single bundled `.js` file, paste-able or uploadable to Adventure Land CODE
**Build command**: `npx esbuild src/boot.js --bundle --outfile=dist/bot.js --format=iife`

**Requirements**: R1, R43, R50
