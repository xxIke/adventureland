# Data Flow

How data moves through the bot system — from game API through world model to consumer systems, across characters, and into persistence.

## Primary Data Flow

```
Game API (character, parent.entities, G)
    |
    v
WorldModel (polls game state, writes ctx.world)
    |
    v (read-only)
    +-- Objective      reads world + config + localStorage -> writes ctx.objective
    |     |
    |     v (read-only)
    |     +-- Targeting      reads world + objective -> writes ctx.targeting
    |     |     |
    |     |     v (read-only)
    |     |     +-- Attack         reads targeting -> executes attack()/heal()
    |     |     +-- Combat Skills  reads targeting -> uses class combat skills
    |     |
    |     +-- Movement       reads objective + targeting + party.tank -> selects mode, executes
    |
    +-- Party          reads world + config -> writes ctx.party (tank), party plumbing (invites, status, CM)
    +-- Merchant Skills reads world -> buff/bless nearby characters
    +-- Potion/Regen   reads character state + world hostiles -> recovery
    +-- Logging        reads world + all ctx -> reports
```

**Key rules**:
- Data flows downward: WorldModel -> Objective -> Targeting -> Attack/Combat Skills. Each layer writes its own `ctx.*` slot. Party writes `ctx.party` (tank identification).
- Movement reads `ctx.objective` (mode), `ctx.targeting` (repositioning target), and `ctx.party.tank` (kite decision). It does not need events to know what to do.
- Potion/Regen reads game globals (`character.targets`, `character.hp/mp`) and WorldModel hostile presence directly — independent of all other systems. Works for all character types.
- If `ctx.world` is wrong, the bug is in WorldModel. If `ctx.objective` is wrong, the bug is in Objective. If `ctx.targeting` is wrong, the bug is in Targeting.

## Event Bus Signals

Events are secondary coordination — they notify systems that something happened, but systems make decisions by reading world state, not by reacting to events.

### Signal Catalog

| Event | Emitter | Consumers | Payload | Purpose |
|-------|---------|-----------|---------|---------|
| `objective:changed` | Objective | Logging | `{ from, to, target }` | Decision logging |
| `targeting:changed` | Targeting | Logging | `{ previous, current, type, reason }` | Decision logging |
| `world:hostile-player-detected` | WorldModel | Logging | `{ player }` | Alert logging |
| `world:special-monster-detected` | WorldModel | Logging | `{ monster }` | Alert logging |
| `system:error` | Any | Logging | `{ system, operation, error }` | Error reporting |

**Removed signals**: `combat:target-changed` (replaced by `targeting:changed`), `movement:request` (movement reads context directly), `party:need-supply` (objective reads localStorage), `party:status-update` (party writes to localStorage).

**Cross-character communication**: Real-time coordination uses `send_cm()` — see [CM protocol](#code-messages-cm) below. Passive sharing uses localStorage — see [localStorage sharing](#localstorage-sharing).

This catalog will grow as contracts are defined. New events follow the `{system}:{signal}` naming convention.

## Cross-Character Communication

### Code Messages (CM)

`send_cm()` is Adventure Land's built-in cross-character messaging. Used for active, real-time coordination.

**Use cases**:
- Party assembly commands (invite, join, ready)
- Objective directives from leader to hunters
- Supply delivery coordination (merchant arriving, ready for trade)
- Emergency signals (flee, regroup)

**Message protocol** (defined in Party contract):
- Messages are typed with a `type` field
- Each type has a defined payload shape
- Messages include sender identification

### localStorage Sharing

localStorage is shared across all characters on the same browser. Used for persistent, non-urgent data sharing.

**Use cases**:
- Party status snapshots (who is alive, what state, current HP%)
- Current farming objective (so all characters can read it)
- Merchant inventory snapshot (what's available)
- Farm target override (manually set via localStorage, read by objective system)
- Supply wishlists (hunters publish needs, merchant reads)

**Advantages over CM**:
- No code cost (CM uses bandwidth toward the game's rate limit)
- Persistent across reloads
- Readable by any character at any time without request/response

**Disadvantages**:
- Not real-time — requires polling
- No delivery guarantee (reader must check)
- Stale data risk (requires freshness rules per key)

### When to Use Which

| Need | Channel |
|------|---------|
| Real-time command/response | CM |
| Persistent status sharing | localStorage |
| Emergency coordination | CM |
| Background supply monitoring | localStorage |
| Objective changes | CM (immediate) + localStorage (persistent) |

## Persistence Flow

### On Disconnect

```
scheduler.stop()
  -> Each system persists its critical state to localStorage
  -> Keys written per localStorage schema (see infrastructure.md)
```

### On Reconnect

```
scheduler.start()
  -> WorldModel polls fresh game state
  -> Systems read localStorage for recovered state
  -> Systems resume from combination of fresh game state + recovered context
```

### What Gets Persisted

| Data | Owner | When Written | Recovery Use |
|------|-------|-------------|-------------|
| Current objective/state | Objective | On change | Resume objective after reload |
| Merchant inventory/status | Objective (merchant strategy) | On change | Continue supply workflow |
| Party roster status | Party | Periodic | Re-establish party without re-discovery |
| Farm target override | Config | On manual change | Maintain target selection |
| Log snapshot | Logging | Periodic | Post-mortem debugging |
