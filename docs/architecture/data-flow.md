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
    +-- Objective     reads world -> decides current goal
    +-- Combat        reads world + objective -> selects targets, fights
    +-- Movement      reads world + objective -> travels, repositions
    +-- Merchant      reads world -> manages inventory, supply
    +-- Potion/Regen  reads character HP/MP -> uses consumables
    +-- Logging       reads world + system states -> reports
```

**Key rule**: Data flows downward from WorldModel. Consumer systems read `ctx.world` but never write to it. This makes data flow traceable — if a value in `ctx.world` is wrong, the bug is in WorldModel.

## Event Bus Signals

Events are secondary coordination — they notify systems that something happened, but systems make decisions by reading world state, not by reacting to events.

### Signal Catalog

| Event | Emitter | Consumers | Payload | Purpose |
|-------|---------|-----------|---------|---------|
| `objective:changed` | Objective | Combat, Movement, Party | `{ from, to, target }` | Strategy swaps, movement mode changes |
| `combat:target-changed` | Combat | Logging | `{ previous, current, reason }` | Decision logging |
| `movement:request` | Combat, Party | Movement | `{ type, target, priority }` | Repositioning or rally requests |
| `party:need-supply` | Party | Merchant | `{ character, needs }` | Supply request from hunter |
| `party:status-update` | Party | Logging | `{ members, state }` | Party state changes |
| `world:hostile-player-detected` | WorldModel | Combat, Logging | `{ player }` | Alert to new hostile player |
| `world:special-monster-detected` | WorldModel | Objective, Logging | `{ monster }` | Alert to new special monster |
| `system:error` | Any | Logging | `{ system, operation, error }` | Error reporting |

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
| Party roster status | Party | Periodic | Re-establish party without re-discovery |
| Merchant inventory | Merchant | On change | Continue supply workflow |
| Farm target override | Config | On manual change | Maintain target selection |
| Log snapshot | Logging | Periodic | Post-mortem debugging |
