---
system: Party
writes:
  ctx.party:
    - tank: string | null
    - basic_dps: number
    - travelSync: object
reads:
  ctx.world:
    - partyMembers
  ctx.objective:
    - type
    - target
  ctx.config:
    - roster
    - friendlyPlayers
game_globals:
  - character
  - send_cm()
external:
  - "localStorage: party status snapshots"
  - "localStorage: travel coordination"
  - "localStorage: party stats"
---

# Party Contract

## Identity

The Party system maintains party membership and provides the plumbing for cross-character coordination. It handles the mechanical aspects of party management — invites, status publishing, CM message routing, travel synchronization — but does NOT make decisions about what the bot should do.

**Scheduling**: Registered as `'party'` at ~2-5s interval. Party state doesn't change rapidly. Not adaptive.

## Dependencies

- `ctx.world` — reads `partyMembers`, nearby characters
- `ctx.objective` — reads current objective for status publishing
- `ctx.config` — reads `roster` (expected characters, friends)
- `ctx.logger` — logs party events
- localStorage — reads/writes party status snapshots and coordination data
- Game globals: `character`, `send_cm()`, `accept_party_invite()`, `send_party_invite()`

## Public Interface

### `createParty(ctx)`

Creates and returns a Party system instance. Sets up CM message listener on construction.

**Parameters:**
- `ctx` (object) — shared context

**Returns:** Object with:
- `tick()` — evaluation function registered with scheduler
- `sendMessage(target, type, data)` — send a typed CM to another character
- `getState()` — returns party state for diagnostics

### `party.tick()`

Main evaluation tick:

1. **Party assembly**: Check if all expected characters (from `ctx.config.roster`) are in the party. For any missing online character, send invite. Accept pending invites from own characters and friends.
2. **Status publishing**: Write periodic status snapshot to localStorage.
3. **Travel coordination**: If `ctx.objective.type` is `'travel'`, publish travel sync data (position, speed, destination checkpoint) to localStorage for other party members to read.

**Returns:** void.

### `party.sendMessage(target, type, data)`

Send a typed code message to another character.

**Parameters:**
- `target` (string) — character name
- `type` (string) — message type identifier
- `data` (object) — message payload

Wraps `send_cm()` with the typed message protocol. Adds sender identification automatically.

### `party.getState()`

**Returns:** `{ members: string[], missing: string[], travelSync: object }`

## Party Assembly

Party membership is a game mechanic — if a character is online, it should be in the party. The Party system enforces this automatically.

### Assembly Logic

Each tick:
1. Get expected party members from `ctx.config.roster` (own characters + configured friends).
2. Check which are currently in the party (via `ctx.world.partyMembers`).
3. For each missing member: if they appear in `parent.entities` (nearby and online), send party invite.
4. Accept any pending party invites from characters in the roster or friends list.

Uses `maintainParty()` utility function (from v2 `02-playerUtils.2.js`).

### Multi-Player Support

The party may include characters beyond the bot owner's characters:
- Friends' characters (configured in roster)
- Alt account characters (using agreed coordination protocol)

Inter-player coordination happens through the merchant as the consistent always-on interface. Full multi-player coordination is a later stage — the typed CM protocol and party acceptance logic plumbs for it now.

## Status Publishing

Periodic snapshots written to localStorage for passive cross-character access.

### Status Snapshot Shape

**Key**: `al_bot:party:{characterName}:status`

```
{
  name: string,
  ctype: string,         // character class
  hp: number,
  max_hp: number,
  mp: number,
  max_mp: number,
  level: number,
  map: string,           // current map
  x: number, y: number,  // current position
  objective: string,     // current objective type from ctx.objective
  target: any,           // current objective target
  alive: boolean,
  potions: {              // potion inventory for restock detection (R23/R25)
    hpot0: number,
    hpot1: number,
    mpot0: number,
    mpot1: number,
  },
  emptySlots: number,     // available inventory space
  gold: number,           // gold on hand
  needsResupply: boolean, // potions < 50% target OR inventory > 50% full
  lastUpdated: number,
}
```

**Freshness**: Updated every party tick (~2-5s). Considered stale after 30s (missed ~6+ updates).

## CM Message Protocol

Typed messages for real-time coordination. CMs are for triggered responses — anything that can be polled passively belongs in localStorage instead.

### Message Envelope

```
{
  type: string,        // message type
  sender: string,      // character name (added automatically by sendMessage)
  data: object,        // type-specific payload
  timestamp: number,
}
```

### Message Types (Phase 3)

| Type | Direction | Payload | Purpose |
|------|-----------|---------|---------|
| `'party-invite'` | Any -> Any | `{}` | Request to join party (supplements game invite) |
| `'objective-directive'` | Merchant -> Hunter | `{ type, target, location }` | Merchant assigns objective |
| `'status-request'` | Any -> Any | `{}` | Request immediate status update |
| `'emergency'` | Any -> All | `{ type: 'flee'\|'regroup', location }` | Emergency coordination |

### Message Types (Phase 4+)

| Type | Direction | Payload | Purpose |
|------|-----------|---------|---------|
| `'supply-request'` | Hunter -> Merchant | `{ needs: [{item, quantity}] }` | Request potions/supplies |
| `'supply-delivery'` | Merchant -> Hunter | `{ arriving: true, eta: number }` | Merchant en route |
| `'trade-ready'` | Merchant -> Hunter | `{}` | Ready for item exchange |
| `'hunt-eval-request'` | Hunter -> Merchant | `{ monster, count, expiry }` | Hunter has new hunt, needs viability check (R37) |
| `'hunt-eval-response'` | Merchant -> Hunter | `{ viable: boolean, target?, location? }` | Merchant's hunt viability assessment (R37) |
| `'gear-available'` | Merchant -> Hunter | `{ items: [{name, level, slot}] }` | Notify hunter of available gear upgrades (R56) |

### CM Handling

On construction, Party registers a CM listener:

```
on_cm = (sender, data) => { ... }
```

Incoming CMs are validated (typed, from known sender) and routed. Invalid or unknown messages are logged and discarded.

## Tank Identification

The party tank is the character best suited to absorb damage. Tank identity is recalculated whenever party membership changes (member joins or leaves).

### Tank Score

```
tankScore = max_hp + armor + resistance
```

Every 100 armor reduces incoming physical damage by 10% (diminishing). Every 100 resistance reduces incoming magical damage by 10% (diminishing). This formula provides a simple survivability proxy. It can be refined later if more granular threat modeling becomes relevant.

### Assignment

Party stats (including tank) are calculated and assigned by the **merchant** character, which has full party context through localStorage status snapshots.

- Merchant calculates tankScore for all party members from status snapshots
- Merchant calculates basic party DPS from combined character stats
- Merchant writes results to localStorage key `al_bot:party:stats` with shape:
  ```
  { tank: string, basic_dps: number, lastUpdated: number }
  ```
- All characters read `al_bot:party:stats` from localStorage and publish to `ctx.party`
- This key is expandable for future cached/pre-calculated party heuristics

**Why merchant**: Not all characters can see all party members in `parent.entities` (visibility range is limited). The merchant has full party context via localStorage status snapshots and is the best-positioned system for party composition awareness. Clear ownership: merchant is sole writer to `al_bot:party:stats`.

### Publishing

The current tank and party stats are published to `ctx.party` so that other systems can reference them:
- **Movement** reads `ctx.party.tank` to determine if this character should kite when targeted by a hostile (non-tank characters kite; tank holds ground).
- **Targeting** may read `ctx.party.tank` for future aggro coordination (Phase 3+).
- **Monster/Farming utilities** read `ctx.party.basic_dps` for farmability assessment.

### Context Shape

```
ctx.party = {
  tank: string | null,       // name of the current party tank, null if solo
  basic_dps: number | null,  // combined party DPS estimate
  travelSync: {              // party travel coordination (R51)
    destination: { x, y, map } | null,
    slowestSpeed: number | null,
    active: boolean,
  },
}
```

If the character is solo (no party), `tank` is `null` — the solo character is implicitly the tank (does not kite).

---

## Travel Coordination

When the party travels together, characters should synchronize movement.

### Speed Synchronization

During group travel (`ctx.objective.type === 'travel'`):
- Each character publishes their speed to localStorage.
- Movement system reads the slowest party member's speed and limits its own travel speed to match.
- Characters move through shared checkpoints rather than independently navigating.

### Checkpoint Protocol

**Key**: `al_bot:party:travel`

```
{
  destination: { x, y, map },
  checkpoints: [{ x, y, map }],
  currentCheckpoint: number,
  slowestSpeed: number,
  lastUpdated: number,
}
```

The party leader (merchant) writes the travel plan. Hunters read and follow. Merchant stand must close before any movement including travel sync (R52). Movement system reads `ctx.party.travelSync` for speed matching — if `active` is true, character speed is limited to `slowestSpeed`.

**Requirements**: R51

---

## Trade-Slot Coordination (R55)

Hunters maintain game trade slots listing needed items at 1g/item. The merchant fulfills own characters' trade-slot requests when nearby without price evaluation. This uses the game's built-in trade system, not CM or localStorage — the merchant scans nearby characters' trade slots and purchases listed items. WorldModel already categorizes `charactersOfferingTrade`.

No Party system plumbing is needed for this — it is a game mechanic interaction handled by the Objective system's merchant strategy.

## Context Dependencies

```yaml
writes:
  ctx.party:
    tank: string | null    # name of the party tank, recalculated on membership change

reads:
  ctx.world:
    - partyMembers
  ctx.objective:
    - type              # for status publishing
    - target            # for status publishing
  ctx.config:
    - roster
    - friendlyPlayers
```

## Behavior Contracts

### Invariants

1. Party never writes to `ctx.world`, `ctx.objective`, or `ctx.targeting`.
2. Party never calls `attack()`, `heal()`, or `move()`.
3. Party does not make decisions about what the bot should do — it provides coordination plumbing.
4. CM messages from unknown senders are discarded with a log warning.
5. The tick function never throws to the scheduler.

### Error Handling

1. If `send_cm()` throws, log and continue. Message delivery is best-effort.
2. If localStorage reads fail, skip status update. Stale data is acceptable.
3. If CM listener receives malformed data, log and discard.
4. The tick never throws to the scheduler.

## Event Contracts

### Events Emitted

None. Party publishes via localStorage and CM, not internal events.

### Events Consumed

None internally. CM messages are handled via game API `on_cm` callback.

## Requirements Traceability

| Requirement | How Satisfied |
|-------------|---------------|
| R7 (party maintenance) | Automatic invite/accept for own characters and friends |
| R8 (cross-character communication) | Typed CM protocol + localStorage status snapshots |
| R42 (explicit responsibilities) | Party manages membership and coordination plumbing only |
| R44 (no silent failures) | CM and localStorage errors caught and logged |
| R46 (shared state schema) | localStorage keys documented with ownership and shape |
