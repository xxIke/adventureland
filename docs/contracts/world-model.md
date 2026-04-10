---
system: WorldModel
writes:
  ctx.world:
    - specialMonsters: Entity[]
    - targetMonsters: Entity[]
    - easyMonsters: Entity[]
    - hostileMonsters: Entity[]
    - hostilePlayers: Entity[]
    - partyMembers: Entity[]
    - charactersOfferingTrade: Entity[]
    - lastUpdated: number
reads:
  ctx.config:
    - specialMonsters
    - farmTarget
    - friendlyPlayers
game_globals:
  - character
  - parent.entities
  - G
external: []
---

# WorldModel Contract

## Identity

The WorldModel translates raw game state into a queryable, categorized local model. It is the sole writer to `ctx.world`. All other systems read from `ctx.world` but never write to it.

**Scheduling**: Registered with the scheduler at ~250–500ms interval. Must run before systems that consume `ctx.world`.

## Dependencies

- `ctx.bus` — emits entity change signals
- `ctx.config` — reads roster and current objective target for entity categorization
- Game globals: `character`, `parent.entities`, `G`

## Public Interface

### `createWorldModel(ctx)`

Creates and returns a WorldModel instance. The returned object's `tick` function is registered with the scheduler.

**Parameters:**
- `ctx` (object) — shared context

**Returns:** Object with:
- `tick()` — survey function called by the scheduler each cycle

## World State Shape (`ctx.world`)

After each tick, `ctx.world` is populated with:

```
ctx.world = {
  specialMonsters: [],        // rare/event monsters (phoenix, mvampire, etc.)
  targetMonsters: [],         // monsters matching current objective target type
  easyMonsters: [],           // monsters killable quickly (HP < character.attack * 0.8)
  hostileMonsters: [],        // monsters currently targeting a party member
  hostilePlayers: [],         // players currently targeting a party member (with attacks)
  partyMembers: [],           // nearby party members (includes non-owned characters in party)
  charactersOfferingTrade: [], // nearby characters with active trade slots
  lastUpdated: number,        // Date.now() timestamp of last survey
}
```

Each array contains raw entity references from `parent.entities`. The WorldModel does not clone or transform entities — it categorizes them.

### Entity Filtering Rules

The `tick` function performs a **single pass** over `parent.entities`, categorizing each entity:

**Skip conditions** (entity is ignored entirely):
- `!entity.visible`
- `entity.dead` or `entity.rip`
- `entity.type === "npc"`

**Character entities** (`entity.type === "character"`):

Friendly and hostile are **independent categories** — not being friendly does not make a character hostile. A character must be actively attacking a party member AND not be friendly to qualify as hostile.

| Category | Condition |
|----------|-----------|
| `partyMembers` | Entity is in the same party as `character` (`entity.party` is truthy AND `entity.party === character.party`) |
| `hostilePlayers` | Entity is NOT friendly AND `entity.target` matches the name of any current `partyMembers` entry. See hostile detection note below. |
| `charactersOfferingTrade` | Entity has at least one occupied trade slot (`entity.slots` contains a key matching `"trade"` with a non-null value) |

**Friendly detection**: A character is friendly if owned by a friendly player. Friendly players are: the current account (`entity.owner === character.owner`), or a player in the configured friendly players list (`ctx.config.friendlyPlayers`). The game's `character.friends` list is not programmatically accessible in a reliable format, so friendly player IDs must be configured explicitly.

**Hostile detection note**: `entity.target` is set by both `attack()` and `heal()` (see [game-api.md](../game-api.md)). A healer targeting a party member will have `entity.target` set to that member's name. The friendly check runs first as a gate — if an entity is friendly, it is never evaluated for hostility. This provides acceptable grace for performance while preventing healer false-positives from friendly players.

**Monster entities** (`entity.type === "monster"`):

| Category | Condition |
|----------|-----------|
| Skip | `entity.xp < 0` (non-combatant) |
| `hostileMonsters` | `entity.target` matches the name of any current `partyMembers` entry |
| `specialMonsters` | `entity.mtype` or `entity.name` matches a known special monster identifier (configurable list) |
| `targetMonsters` | `entity.mtype` matches the current objective target type from `ctx.config.farmTarget` |
| `easyMonsters` | `entity.hp < character.attack * 0.8` |

**Notes:**
- A monster can appear in multiple categories (e.g., a hostile special monster appears in both `hostileMonsters` and `specialMonsters`).
- `partyMembers` always includes `character` (self) as the first entry.
- Friendly detection uses: same `owner`, or owner in `ctx.config.friendlyPlayers` list.
- A character not classified as friendly is NOT automatically hostile — hostility requires `entity.target` matching a party member AND not being friendly.

### PvP Zone Awareness (R14)

WorldModel should expose whether the current map is a PvP zone. This information is available from `G.maps[character.map].pvp` (boolean). When in a PvP zone, entity monitoring should be more aggressive — all non-friendly player characters are potential threats even without active `entity.target` against party members.

This is a future enhancement. Current hostile player detection (active targeting check) is sufficient for MVP.

### Special Monster List

The list of special monster identifiers is maintained in configuration. Initial set:

```
["phoenix", "mvampire"]
```

This list is matched via substring against `entity.mtype` and `entity.name`.

## Context Dependencies

```yaml
writes:
  ctx.world:
    specialMonsters: Entity[]
    targetMonsters: Entity[]
    easyMonsters: Entity[]
    hostileMonsters: Entity[]
    hostilePlayers: Entity[]
    partyMembers: Entity[]
    charactersOfferingTrade: Entity[]
    lastUpdated: number

reads:
  ctx.config:
    - specialMonsters     # list of special monster identifiers
    - farmTarget          # current farm target monster type
    - friendlyPlayers     # list of friendly player owner IDs
```

## Behavior Contracts

### Survey Invariants

1. `ctx.world` is fully replaced each tick — stale entries from previous ticks do not persist.
2. All category arrays are freshly allocated each tick. Consumer systems must not hold references across ticks.
3. `ctx.world.lastUpdated` is set to `Date.now()` at the end of each survey.
4. The survey is a single iteration over `parent.entities`. No category requires a separate pass.

### Data Ownership

1. WorldModel is the **sole writer** to `ctx.world`. No other system may write to any `ctx.world` property.
2. WorldModel reads game globals directly (`character`, `parent.entities`). It does not read from other systems' state.
3. WorldModel reads `ctx.config.farmTarget` to determine `targetMonsters` categorization.

### Error Handling

1. If `parent.entities` is unavailable (e.g., during disconnect), `ctx.world` arrays are set to empty and `lastUpdated` is still written. The system does not throw.
2. Individual entity processing errors are caught and logged. A bad entity does not prevent the rest of the survey from completing.

## Event Contracts

### Events Emitted

| Event | Payload | When |
|-------|---------|------|
| `world:hostile-player-detected` | `{ player }` | A hostile player is detected that was not in the previous tick's `hostilePlayers` |
| `world:special-monster-detected` | `{ monster }` | A special monster is detected that was not in the previous tick's `specialMonsters` |

These events are informational signals. Systems must not rely on them for primary decision-making — they read `ctx.world` directly.

### Events Consumed

None. WorldModel reads game globals, not events.

## Character Self-Reference

WorldModel does **not** include a character state snapshot in `ctx.world`. Systems that need character state (HP, MP, position, class, level) read from the `character` game global directly.

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R5 (structured world view) | Categorized entity collections refreshed each tick |
| R6 (raw vs derived separation) | WorldModel produces categorized observations only; targeting decisions belong to Combat/Objective |
| R42 (explicit subsystem responsibilities) | WorldModel has one job: survey and categorize. No decision-making. |
| R44 (no silent failures) | Entity processing errors are caught and logged, not swallowed |
